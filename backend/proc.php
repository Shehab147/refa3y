<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

const TOKEN_TTL_SECONDS = 2592000; // 30 days
const DELIVERY_FEE = 35.00;
const SERVICE_FEE = 8.00;

/** The API accepts `?action=...` for GET and `action` in JSON/form data otherwise. */
function action_name(): string
{
    return trim((string) (query_param('action', input('action', ''))));
}

function health(): never { respond(200, 'Refa3y API is running.'); }

function id_input(string $key = 'id'): int
{
    $value = input($key, query_param($key));
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) fail(422, "{$key} is invalid.");
    return $id;
}

function optional_id(string $key): ?int
{
    $value = input($key, query_param($key));
    if ($value === null || $value === '') return null;
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) fail(422, "{$key} is invalid.");
    return $id;
}

function optional_bool(string $key, bool $default = false): bool
{
    $value = input($key, query_param($key, $default));
    $parsed = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    if ($parsed === null) fail(422, "{$key} must be true or false.");
    return $parsed;
}

function clean_text(string $key, int $maxLength, bool $required = true): ?string
{
    $value = $required ? required_string($key, $maxLength) : nullable_string($key, $maxLength);
    if ($value !== null && preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value)) {
        fail(422, "{$key} contains invalid characters.");
    }
    return $value;
}

function required_url(string $key, int $maxLength = 500): string
{
    $url = required_string($key, $maxLength);
    $parts = parse_url($url);
    if ($parts === false || !isset($parts['scheme'], $parts['host']) || !in_array(strtolower($parts['scheme']), ['https', 'http'], true)) {
        fail(422, "{$key} must be a valid http(s) URL.");
    }
    return $url;
}

function token_secret(): string
{
    $secret = env_value('API_AUTH_SECRET');
    if ($secret === null || strlen($secret) < 32) fail(500, 'API authentication is not configured.');
    return $secret;
}

function b64url_encode(string $value): string { return rtrim(strtr(base64_encode($value), '+/', '-_'), '='); }
function b64url_decode(string $value): string|false { return base64_decode(strtr($value, '-_', '+/'), true); }

function issue_token(array $user): string
{
    $payload = ['sub' => (int) $user['id'], 'role' => $user['role'], 'exp' => time() + TOKEN_TTL_SECONDS];
    $body = b64url_encode(json_encode($payload, JSON_THROW_ON_ERROR));
    return $body . '.' . b64url_encode(hash_hmac('sha256', $body, token_secret(), true));
}

/** @return array<string, mixed> */
function authenticated_user(): array
{
    static $user = null;
    if ($user !== null) return $user;
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/', $header, $matches)) fail(401, 'Authentication is required.');
    [$body, $signature] = explode('.', $matches[1], 2);
    $expected = b64url_encode(hash_hmac('sha256', $body, token_secret(), true));
    $decoded = b64url_decode($body);
    if ($decoded === false || !hash_equals($expected, $signature)) fail(401, 'Invalid authentication token.');
    try { $payload = json_decode($decoded, true, 32, JSON_THROW_ON_ERROR); } catch (JsonException) { fail(401, 'Invalid authentication token.'); }
    if (!is_array($payload) || !isset($payload['sub'], $payload['exp']) || !is_int($payload['sub']) || $payload['exp'] < time()) fail(401, 'Authentication token has expired.');
    $user = db_one('SELECT id, full_name, email, phone, role, avatar_url, is_phone_verified, is_email_verified, status, created_at FROM users WHERE id = ? LIMIT 1', 'i', [$payload['sub']]);
    if ($user === null || $user['status'] !== 'active') fail(403, 'This account is unavailable.');
    return $user;
}

/** @return array<string, mixed> */
function require_user(array $roles = []): array
{
    $user = authenticated_user();
    if ($roles !== [] && !in_array($user['role'], $roles, true)) fail(403, 'You do not have permission for this action.');
    return $user;
}

/** @return array<string, mixed> */
function owned_farm(array $user): array
{
    $farm = db_one('SELECT * FROM farms WHERE owner_user_id = ? LIMIT 1', 'i', [(int) $user['id']]);
    if ($farm === null) fail(403, 'No farm is associated with this account.');
    return $farm;
}

function notify_user(int $userId, string $type, string $title, ?string $body = null, array $data = []): void
{
    db_statement('INSERT INTO notifications (user_id, notification_type, title, body, data_json) VALUES (?, ?, ?, ?, ?)', 'issss', [$userId, $type, $title, $body, $data === [] ? null : json_encode($data, JSON_UNESCAPED_UNICODE)]);
}

function require_password(string $key = 'password'): string
{
    $password = (string) input($key, '');
    if (strlen($password) < 8 || strlen($password) > 128 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9\W]/', $password)) {
        fail(422, "{$key} must be 8–128 characters and include letters plus a number or symbol.");
    }
    return $password;
}

function unique_slug(string $table, string $base, ?int $farmId = null): string
{
    $base = substr(slugify($base), 0, 180) ?: 'item';
    $slug = $base;
    $number = 2;
    while (db_exists($table === 'farms' ? 'SELECT 1 FROM farms WHERE slug = ? LIMIT 1' : 'SELECT 1 FROM products WHERE farm_id = ? AND slug = ? LIMIT 1', $table === 'farms' ? 's' : 'is', $table === 'farms' ? [$slug] : [$farmId, $slug])) {
        $slug = substr($base, 0, 180 - strlen((string) $number) - 1) . '-' . $number++;
    }
    return $slug;
}

function public_product_query(bool $one = false): string
{
    $limit = $one ? ' LIMIT 1' : '';
    return 'SELECT p.*, c.name AS category_name, c.slug AS category_slug, f.name AS farm_name, f.slug AS farm_slug, f.governorate, f.area, f.latitude, f.longitude, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1) AS image_url FROM products p JOIN farms f ON f.id = p.farm_id LEFT JOIN categories c ON c.id = p.category_id WHERE p.is_active = 1 AND p.published_at IS NOT NULL AND f.is_active = 1 AND f.verification_status = \'verified\'' . $limit;
}

/** @return array<string, string> Development-only metadata, never send in production. */
function create_verification_code(?int $userId, string $phone, string $purpose): array
{
    db_statement('UPDATE verification_codes SET consumed_at = NOW() WHERE phone = ? AND purpose = ? AND consumed_at IS NULL', 'ss', [$phone, $purpose]);
    $code = (string) random_int(100000, 999999);
    db_statement('INSERT INTO verification_codes (user_id, phone, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))', 'isss', [$userId, $phone, $purpose, password_hash($code, PASSWORD_DEFAULT)]);
    // Integrate an SMS provider here. The code is only exposed in local development.
    return env_value('APP_ENV', 'production') === 'local' ? ['verification_code' => $code] : [];
}

function consume_verification_code(string $phone, string $purpose, string $code): ?array
{
    if (!preg_match('/^\d{6}$/', $code)) fail(422, 'code must contain six digits.');
    $record = db_one('SELECT * FROM verification_codes WHERE phone = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1', 'ss', [$phone, $purpose]);
    if ($record === null || (int) $record['attempts'] >= 5) return null;
    db_statement('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?', 'i', [(int) $record['id']]);
    if (!password_verify($code, $record['code_hash'])) return null;
    db_statement('UPDATE verification_codes SET consumed_at = NOW() WHERE id = ?', 'i', [(int) $record['id']]);
    return $record;
}

function auth_register(): never
{
    require_method('POST');
    $fullName = clean_text('full_name', 150);
    $phone = normalize_phone(required_string('phone', 30));
    $emailRaw = nullable_string('email', 191);
    $email = $emailRaw === null ? null : normalize_email($emailRaw);
    $role = required_enum('role', ['buyer', 'vendor']);
    $password = require_password();
    if (db_exists('SELECT 1 FROM users WHERE phone = ? OR (? IS NOT NULL AND email = ?) LIMIT 1', 'sss', [$phone, $email, $email])) fail(409, 'An account already uses this phone number or email.');
    $hash = password_hash($password, PASSWORD_DEFAULT);
    db_statement('INSERT INTO users (full_name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', 'sssss', [$fullName, $phone, $email, $hash, $role]);
    $userId = db_insert_id();
    $user = db_one('SELECT id, full_name, email, phone, role, avatar_url, is_phone_verified, is_email_verified, status, created_at FROM users WHERE id = ?', 'i', [$userId]);
    $extra = create_verification_code($userId, $phone, 'phone_verification');
    respond(201, 'Account created. Verify the phone number to activate all features.', ['token' => issue_token($user), 'user' => $user], $extra);
}

function auth_login(): never
{
    require_method('POST');
    $identity = trim((string) input('identity', ''));
    $password = (string) input('password', '');
    if ($identity === '' || $password === '') fail(422, 'identity and password are required.');
    $user = db_one('SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1', 'ss', [$identity, strtolower($identity)]);
    if ($user === null || !password_verify($password, $user['password_hash'])) fail(401, 'Invalid sign-in details.');
    if ($user['status'] !== 'active') fail(403, 'This account is unavailable.');
    db_statement('UPDATE users SET last_login_at = NOW() WHERE id = ?', 'i', [(int) $user['id']]);
    unset($user['password_hash']);
    respond(200, 'Signed in.', ['token' => issue_token($user), 'user' => $user]);
}

function auth_verify_phone(): never
{
    require_method('POST'); $user = require_user();
    if (consume_verification_code($user['phone'], 'phone_verification', required_string('code', 6)) === null) fail(422, 'The verification code is invalid or expired.');
    db_statement('UPDATE users SET is_phone_verified = 1 WHERE id = ?', 'i', [(int) $user['id']]);
    respond(200, 'Phone number verified.');
}

function auth_forgot_password(): never
{
    require_method('POST'); $phone = normalize_phone(required_string('phone', 30));
    $user = db_one('SELECT id FROM users WHERE phone = ? AND status = \'active\' LIMIT 1', 's', [$phone]);
    // Same response prevents account enumeration.
    if ($user === null) respond(202, 'If the account exists, a verification code was sent.');
    respond(202, 'If the account exists, a verification code was sent.', null, create_verification_code((int) $user['id'], $phone, 'password_reset'));
}

function auth_reset_password(): never
{
    require_method('POST');
    $phone = normalize_phone(required_string('phone', 30));
    if (consume_verification_code($phone, 'password_reset', required_string('code', 6)) === null) fail(422, 'The verification code is invalid or expired.');
    $password = require_password('new_password');
    db_statement('UPDATE users SET password_hash = ? WHERE phone = ?', 'ss', [password_hash($password, PASSWORD_DEFAULT), $phone]);
    respond(200, 'Password updated.');
}

function profile_get(): never { require_method('GET'); respond(200, 'Profile retrieved.', require_user()); }
function profile_update(): never
{
    require_method(['PUT', 'PATCH', 'POST']); $user = require_user();
    $name = clean_text('full_name', 150); $emailRaw = nullable_string('email', 191); $email = $emailRaw === null ? null : normalize_email($emailRaw);
    if ($email !== null && db_exists('SELECT 1 FROM users WHERE email = ? AND id != ? LIMIT 1', 'si', [$email, (int) $user['id']])) fail(409, 'That email address is already in use.');
    db_statement('UPDATE users SET full_name = ?, email = ? WHERE id = ?', 'ssi', [$name, $email, (int) $user['id']]); respond(200, 'Profile updated.');
}

function catalog_products(): never
{
    require_method('GET'); $where = []; $types = ''; $values = [];
    $search = trim((string) query_param('search', '')); if ($search !== '') { if (mb_strlen($search) > 100) fail(422, 'search is too long.'); $where[] = '(p.name LIKE ? OR f.name LIKE ?)'; $types .= 'ss'; $values[] = "%{$search}%"; $values[] = "%{$search}%"; }
    $category = trim((string) query_param('category', '')); if ($category !== '') { $where[] = 'c.slug = ?'; $types .= 's'; $values[] = slugify($category); }
    $farmId = query_param('farm_id'); if ($farmId !== null && $farmId !== '') { $id = filter_var($farmId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]); if ($id === false) fail(422, 'farm_id is invalid.'); $where[] = 'p.farm_id = ?'; $types .= 'i'; $values[] = $id; }
    $page = pagination(); $sql = public_product_query() . ($where === [] ? '' : ' AND ' . implode(' AND ', $where)) . ' ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?';
    $types .= 'ii'; $values[] = $page['per_page']; $values[] = $page['offset']; respond(200, 'Products retrieved.', ['items' => db_all($sql, $types, $values), 'pagination' => $page]);
}

function catalog_product(): never
{
    require_method('GET'); $id = id_input(); $product = db_one(public_product_query(true) . ' AND p.id = ?', 'i', [$id]);
    if ($product === null) fail(404, 'Product not found.');
    $product['images'] = db_all('SELECT id, image_url, alt_text, sort_order, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC', 'i', [$id]); respond(200, 'Product retrieved.', $product);
}

function catalog_categories(): never { require_method('GET'); respond(200, 'Categories retrieved.', db_all('SELECT id, name, slug, icon_name, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order, name')); }

function saved_list(): never
{
    require_method('GET'); $user = require_user(['buyer']);
    $items = db_all('SELECT p.id, p.name, p.price, p.currency, p.selling_unit, sp.created_at FROM saved_products sp JOIN products p ON p.id = sp.product_id WHERE sp.user_id = ? ORDER BY sp.created_at DESC', 'i', [(int) $user['id']]); respond(200, 'Saved products retrieved.', $items);
}

function saved_toggle(): never
{
    require_method('POST'); $user = require_user(['buyer']); $productId = id_input('product_id');
    if (!db_exists('SELECT 1 FROM products WHERE id = ? AND is_active = 1 LIMIT 1', 'i', [$productId])) fail(404, 'Product not found.');
    if (db_exists('SELECT 1 FROM saved_products WHERE user_id = ? AND product_id = ? LIMIT 1', 'ii', [(int) $user['id'], $productId])) { db_statement('DELETE FROM saved_products WHERE user_id = ? AND product_id = ?', 'ii', [(int) $user['id'], $productId]); respond(200, 'Product removed from saved items.', ['saved' => false]); }
    db_statement('INSERT INTO saved_products (user_id, product_id) VALUES (?, ?)', 'ii', [(int) $user['id'], $productId]); respond(201, 'Product saved.', ['saved' => true]);
}

function addresses_list(): never { require_method('GET'); $u = require_user(['buyer']); respond(200, 'Addresses retrieved.', db_all('SELECT * FROM buyer_addresses WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC', 'i', [(int) $u['id']])); }
function address_save(): never
{
    require_method(['POST', 'PUT', 'PATCH']); $u = require_user(['buyer']); $id = optional_id('id');
    $label = clean_text('label', 120); $address = clean_text('address_text', 2000); $name = clean_text('recipient_name', 150, false); $phoneRaw = nullable_string('recipient_phone', 30); $phone = $phoneRaw === null ? null : normalize_phone($phoneRaw);
    $governorate = clean_text('governorate', 100, false); $area = clean_text('area', 120, false); $notes = clean_text('delivery_notes', 2000, false);
    if ($id !== null && !db_exists('SELECT 1 FROM buyer_addresses WHERE id = ? AND user_id = ?', 'ii', [$id, (int) $u['id']])) fail(404, 'Address not found.');
    if ($id === null) { $default = !db_exists('SELECT 1 FROM buyer_addresses WHERE user_id = ?', 'i', [(int) $u['id']]); db_statement('INSERT INTO buyer_addresses (user_id,label,recipient_name,recipient_phone,address_text,governorate,area,delivery_notes,is_default) VALUES (?,?,?,?,?,?,?,?,?)', 'isssssssi', [(int) $u['id'],$label,$name,$phone,$address,$governorate,$area,$notes,(int)$default]); respond(201, 'Address created.', ['id' => db_insert_id()]); }
    db_statement('UPDATE buyer_addresses SET label=?,recipient_name=?,recipient_phone=?,address_text=?,governorate=?,area=?,delivery_notes=? WHERE id=? AND user_id=?', 'sssssssii', [$label,$name,$phone,$address,$governorate,$area,$notes,$id,(int)$u['id']]); respond(200, 'Address updated.');
}

function address_default(): never { require_method('POST'); $u=require_user(['buyer']); $id=id_input(); if (!db_exists('SELECT 1 FROM buyer_addresses WHERE id=? AND user_id=?','ii',[$id,(int)$u['id']])) fail(404,'Address not found.'); db_transaction(function() use($u,$id){ db_statement('UPDATE buyer_addresses SET is_default=0 WHERE user_id=?','i',[(int)$u['id']]); db_statement('UPDATE buyer_addresses SET is_default=1 WHERE id=?','i',[$id]); }); respond(200,'Default address updated.'); }
function address_delete(): never { require_method('DELETE'); $u=require_user(['buyer']); $id=id_input(); db_statement('DELETE FROM buyer_addresses WHERE id=? AND user_id=?','ii',[$id,(int)$u['id']]); respond(200,'Address removed.'); }

function payments_list(): never { require_method('GET'); $u=require_user(['buyer']); respond(200,'Payment methods retrieved.',db_all('SELECT id,provider,method_type,card_brand,card_last_four,card_expiry_month,card_expiry_year,display_label,is_default FROM payment_methods WHERE user_id=? AND is_active=1 ORDER BY is_default DESC,updated_at DESC','i',[(int)$u['id']])); }
function payment_create(): never
{
    require_method('POST'); $u=require_user(['buyer']); $type=required_enum('method_type',['cash_on_delivery','card']);
    if ($type === 'cash_on_delivery') { $label='Cash on delivery'; $provider='manual'; $providerId=null; $brand=null; $lastFour=null; $month=null; $year=null; }
    else { if (input('card_number') !== null) fail(422,'Raw card numbers must not be sent to this API. Tokenize the card with a payment provider first.'); $provider=clean_text('provider',80); $providerId=clean_text('provider_payment_method_id',191); $brand=clean_text('card_brand',40,false); $lastFour=required_string('card_last_four',4); if(!preg_match('/^\d{4}$/',$lastFour)) fail(422,'card_last_four must contain four digits.'); $month=required_int('card_expiry_month',1); $year=required_int('card_expiry_year',date('Y')); if($month>12) fail(422,'card_expiry_month is invalid.'); $label=clean_text('display_label',180); }
    $hasDefault=!db_exists('SELECT 1 FROM payment_methods WHERE user_id=? AND is_active=1','i',[(int)$u['id']]); db_statement('INSERT INTO payment_methods (user_id,provider,method_type,card_brand,card_last_four,card_expiry_month,card_expiry_year,provider_payment_method_id,display_label,is_default) VALUES (?,?,?,?,?,?,?,?,?,?)','issssiissi',[(int)$u['id'],$provider,$type,$brand,$lastFour,$month,$year,$providerId,$label,(int)$hasDefault]); respond(201,'Payment method created.',['id'=>db_insert_id()]);
}
function payment_default(): never { require_method('POST'); $u=require_user(['buyer']);$id=id_input();if(!db_exists('SELECT 1 FROM payment_methods WHERE id=? AND user_id=? AND is_active=1','ii',[$id,(int)$u['id']]))fail(404,'Payment method not found.');db_transaction(function()use($u,$id){db_statement('UPDATE payment_methods SET is_default=0 WHERE user_id=?','i',[(int)$u['id']]);db_statement('UPDATE payment_methods SET is_default=1 WHERE id=?','i',[$id]);});respond(200,'Default payment method updated.'); }
function payment_delete(): never { require_method('DELETE');$u=require_user(['buyer']);$id=id_input();db_statement('UPDATE payment_methods SET is_active=0,is_default=0 WHERE id=? AND user_id=?','ii',[$id,(int)$u['id']]);respond(200,'Payment method removed.'); }

function active_cart(array $u): array { $cart=db_one('SELECT * FROM carts WHERE user_id=? AND status=\'active\' ORDER BY id DESC LIMIT 1','i',[(int)$u['id']]);if($cart!==null)return $cart;db_statement('INSERT INTO carts (user_id) VALUES (?)','i',[(int)$u['id']]);return ['id'=>db_insert_id(),'user_id'=>(int)$u['id'],'currency'=>'EGP','note'=>null]; }
function cart_get(): never { require_method('GET');$u=require_user(['buyer']);$cart=active_cart($u);$cart['items']=db_all('SELECT ci.id,ci.product_id,ci.quantity,ci.unit_price,p.name,p.selling_unit,p.stock_quantity,p.is_active,f.id AS farm_id,f.name AS farm_name FROM cart_items ci JOIN products p ON p.id=ci.product_id JOIN farms f ON f.id=p.farm_id WHERE ci.cart_id=? ORDER BY ci.created_at','i',[(int)$cart['id']]);respond(200,'Cart retrieved.',$cart); }
function cart_add(): never
{
    require_method('POST');$u=require_user(['buyer']);$productId=id_input('product_id');$quantity=required_decimal('quantity',0.001);if($quantity>10000)fail(422,'quantity is too large.');$product=db_one('SELECT id,price,stock_quantity,is_active FROM products WHERE id=? LIMIT 1','i',[$productId]);if($product===null||!(int)$product['is_active'])fail(404,'Product not found.');if((float)$product['stock_quantity']<$quantity)fail(409,'Requested quantity is not available.');$cart=active_cart($u);db_statement('INSERT INTO cart_items (cart_id,product_id,quantity,unit_price) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity),unit_price=VALUES(unit_price)','iidd',[(int)$cart['id'],$productId,$quantity,(float)$product['price']]);respond(200,'Cart updated.');
}
function cart_update(): never { require_method(['PATCH','PUT','POST']);$u=require_user(['buyer']);$item=id_input('cart_item_id');$quantity=required_decimal('quantity',0.001);$cart=active_cart($u);$row=db_one('SELECT ci.id,p.stock_quantity FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.id=? AND ci.cart_id=?','ii',[$item,(int)$cart['id']]);if($row===null)fail(404,'Cart item not found.');if((float)$row['stock_quantity']<$quantity)fail(409,'Requested quantity is not available.');db_statement('UPDATE cart_items SET quantity=? WHERE id=?','di',[$quantity,$item]);respond(200,'Cart updated.'); }
function cart_remove(): never { require_method('DELETE');$u=require_user(['buyer']);$cart=active_cart($u);db_statement('DELETE FROM cart_items WHERE id=? AND cart_id=?','ii',[id_input('cart_item_id'),(int)$cart['id']]);respond(200,'Item removed from cart.'); }
function cart_note(): never { require_method(['POST','PATCH']);$u=require_user(['buyer']);$cart=active_cart($u);db_statement('UPDATE carts SET note=? WHERE id=?','si',[clean_text('note',2000,false),(int)$cart['id']]);respond(200,'Cart note updated.'); }

function checkout(): never
{
    require_method('POST');$u=require_user(['buyer']);$addressId=id_input('delivery_address_id');$paymentId=id_input('payment_method_id');$windowId=optional_id('delivery_window_id');
    $order=db_transaction(function()use($u,$addressId,$paymentId,$windowId){$cart=active_cart($u);$address=db_one('SELECT * FROM buyer_addresses WHERE id=? AND user_id=?','ii',[$addressId,(int)$u['id']]);$payment=db_one('SELECT * FROM payment_methods WHERE id=? AND user_id=? AND is_active=1','ii',[$paymentId,(int)$u['id']]);if($address===null||$payment===null)fail(422,'Choose a valid delivery address and payment method.');$items=db_all('SELECT ci.*,p.name,p.farm_id,p.stock_quantity,p.is_active,p.selling_unit,(SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC,sort_order,id LIMIT 1) image_url FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? FOR UPDATE','i',[(int)$cart['id']]);if($items===[])fail(422,'Your cart is empty.');$farmId=(int)$items[0]['farm_id'];foreach($items as $item){if(!(int)$item['is_active']||(int)$item['farm_id']!==$farmId||(float)$item['stock_quantity']<(float)$item['quantity'])fail(409,'One or more cart items are unavailable.');}$window=null;if($windowId!==null){$window=db_one('SELECT * FROM delivery_windows WHERE id=? AND is_active=1 AND (farm_id IS NULL OR farm_id=?) AND starts_at>NOW()','ii',[$windowId,$farmId]);if($window===null)fail(422,'Delivery window is unavailable.');if($window['capacity']!==null&&(int)db_one('SELECT COUNT(*) count FROM orders WHERE delivery_window_id=? AND status NOT IN (\'cancelled\',\'declined\')','i',[$windowId])['count']>=(int)$window['capacity'])fail(409,'Delivery window is full.');}$subtotal=0.0;foreach($items as $item)$subtotal+=(float)$item['quantity']*(float)$item['unit_price'];$number='RF-'.date('Ymd').'-'.strtoupper(bin2hex(random_bytes(3)));$snapshot=implode(', ',array_filter([$address['address_text'],$address['area'],$address['governorate']));db_statement('INSERT INTO orders (order_number,buyer_user_id,farm_id,delivery_address_id,payment_method_id,delivery_window_id,delivery_address_snapshot,buyer_name_snapshot,buyer_phone_snapshot,delivery_window_label,note,payment_status,payment_provider,subtotal_amount,delivery_fee,service_fee,total_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)','siiiiissssssssdddd',[$number,(int)$u['id'],$farmId,$addressId,$paymentId,$windowId,$snapshot,$address['recipient_name']?:$u['full_name'],$address['recipient_phone']?:$u['phone'],$window['label']??null,$cart['note'],$payment['method_type']==='cash_on_delivery'?'pending':'requires_payment',$payment['provider'],$subtotal,DELIVERY_FEE,SERVICE_FEE,$subtotal+DELIVERY_FEE+SERVICE_FEE]);$orderId=db_insert_id();foreach($items as $item){$line=(float)$item['quantity']*(float)$item['unit_price'];db_statement('INSERT INTO order_items (order_id,product_id,product_name_snapshot,product_image_url_snapshot,selling_unit_snapshot,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?,?)','iisssddd',[$orderId,(int)$item['product_id'],$item['name'],$item['image_url'],$item['selling_unit'],(float)$item['quantity'],(float)$item['unit_price'],$line]);db_statement('UPDATE products SET stock_quantity=stock_quantity-? WHERE id=?','di',[(float)$item['quantity'],(int)$item['product_id']]);}db_statement('INSERT INTO order_status_history (order_id,status,note,changed_by_user_id) VALUES (?,\'new\',?,?)','isi',[$orderId,'Order placed',(int)$u['id']]);db_statement('UPDATE carts SET status=\'checked_out\' WHERE id=?','i',[(int)$cart['id']]);return ['id'=>$orderId,'order_number'=>$number,'farm_id'=>$farmId];});$farm=db_one('SELECT owner_user_id FROM farms WHERE id=?','i',[(int)$order['farm_id']]);if($farm!==null)notify_user((int)$farm['owner_user_id'],'new_order','New order '.$order['order_number'],'A new order needs your review.',['order_id'=>$order['id']]);respond(201,'Order placed.',$order);
}

function orders_list(): never { require_method('GET');$u=require_user();$sql=$u['role']==='vendor'?'SELECT o.* FROM orders o JOIN farms f ON f.id=o.farm_id WHERE f.owner_user_id=?':'SELECT o.* FROM orders o WHERE o.buyer_user_id=?';respond(200,'Orders retrieved.',db_all($sql.' ORDER BY o.placed_at DESC','i',[(int)$u['id']])); }
function order_detail(): never { require_method('GET');$u=require_user();$id=id_input();$order=db_one($u['role']==='vendor'?'SELECT o.* FROM orders o JOIN farms f ON f.id=o.farm_id WHERE o.id=? AND f.owner_user_id=?':'SELECT o.* FROM orders o WHERE o.id=? AND o.buyer_user_id=?','ii',[$id,(int)$u['id']]);if($order===null)fail(404,'Order not found.');$order['items']=db_all('SELECT * FROM order_items WHERE order_id=?','i',[$id]);$order['history']=db_all('SELECT status,note,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at','i',[$id]);respond(200,'Order retrieved.',$order); }
function order_status(): never
{
    require_method('POST');$u=require_user(['vendor']);$farm=owned_farm($u);$id=id_input('order_id');$order=db_one('SELECT * FROM orders WHERE id=? AND farm_id=?','ii',[$id,(int)$farm['id']]);if($order===null)fail(404,'Order not found.');$new=required_enum('status',['confirmed','preparing','ready','out_for_delivery','delivered','declined']);$allowed=['new'=>['confirmed','declined'],'confirmed'=>['preparing','declined'],'preparing'=>['ready'],'ready'=>['out_for_delivery'],'out_for_delivery'=>['delivered']];if(!in_array($new,$allowed[$order['status']]??[],true))fail(409,'This order status transition is not allowed.');$reason=$new==='declined'?clean_text('decline_reason',255):null;$timestamp=['confirmed'=>'confirmed_at','preparing'=>'prepared_at','ready'=>'ready_at','out_for_delivery'=>'out_for_delivery_at','delivered'=>'delivered_at','declined'=>'declined_at'][$new];db_transaction(function()use($id,$new,$reason,$timestamp,$u,$order){db_statement("UPDATE orders SET status=?, decline_reason=?, {$timestamp}=NOW() WHERE id=?",'ssi',[$new,$reason,$id]);db_statement('INSERT INTO order_status_history (order_id,status,note,changed_by_user_id) VALUES (?,?,?,?)','issi',[$id,$new,$reason,(int)$u['id']]);if($new==='declined')db_statement('UPDATE products p JOIN order_items oi ON oi.product_id=p.id SET p.stock_quantity=p.stock_quantity+oi.quantity WHERE oi.order_id=?','i',[$id]);});notify_user((int)$order['buyer_user_id'],'order_status','Order '.$order['order_number'].' updated','Your order is now '.str_replace('_',' ',$new),['order_id'=>$id]);respond(200,'Order status updated.');
}

function vendor_products(): never { require_method('GET');$u=require_user(['vendor']);$farm=owned_farm($u);respond(200,'Products retrieved.',db_all('SELECT p.*,c.name category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.farm_id=? ORDER BY p.updated_at DESC','i',[(int)$farm['id']])); }
function vendor_product_save(): never
{
    require_method(['POST','PUT','PATCH']);$u=require_user(['vendor']);$farm=owned_farm($u);$id=optional_id('id');$name=clean_text('name',180);$categoryId=optional_id('category_id');if($categoryId!==null&&!db_exists('SELECT 1 FROM categories WHERE id=? AND is_active=1','i',[$categoryId]))fail(422,'category_id is invalid.');$price=required_decimal('price',0.01);$unit=required_enum('selling_unit',['per kg','per item','per bunch','per box','per litre']);$stock=required_decimal('stock_quantity',0.0);$stockUnit=required_enum('stock_unit',['kg','items','bunches','boxes','litres']);$description=clean_text('description',5000,false);$method=clean_text('farming_method',100,false);$quality=clean_text('quality_tag',100,false);$active=optional_bool('is_active',true);if($id===null){$slug=unique_slug('products',$name,(int)$farm['id']);db_statement('INSERT INTO products (farm_id,category_id,name,slug,description,price,selling_unit,stock_quantity,stock_unit,farming_method,quality_tag,is_active,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())','iisssdsdsssi',[(int)$farm['id'],$categoryId,$name,$slug,$description,$price,$unit,$stock,$stockUnit,$method,$quality,(int)$active]);respond(201,'Product created.',['id'=>db_insert_id()]);}if(!db_exists('SELECT 1 FROM products WHERE id=? AND farm_id=?','ii',[$id,(int)$farm['id']]))fail(404,'Product not found.');db_statement('UPDATE products SET category_id=?,name=?,description=?,price=?,selling_unit=?,stock_quantity=?,stock_unit=?,farming_method=?,quality_tag=?,is_active=? WHERE id=?','issdsdsssii',[$categoryId,$name,$description,$price,$unit,$stock,$stockUnit,$method,$quality,(int)$active,$id]);respond(200,'Product updated.');
}
function vendor_product_delete(): never { require_method('DELETE');$u=require_user(['vendor']);$farm=owned_farm($u);db_statement('UPDATE products SET is_active=0 WHERE id=? AND farm_id=?','ii',[id_input(),(int)$farm['id']]);respond(200,'Product archived.'); }

function farm_get(): never { require_method('GET');$u=require_user(['vendor']);respond(200,'Farm retrieved.',owned_farm($u)); }
function farm_update(): never { require_method(['POST','PATCH','PUT']);$u=require_user(['vendor']);$farm=owned_farm($u);$name=clean_text('name',180);$description=clean_text('public_description',5000,false);$governorate=clean_text('governorate',100,false);$area=clean_text('area',120,false);$address=clean_text('address_text',2000,false);db_statement('UPDATE farms SET name=?,public_description=?,governorate=?,area=?,address_text=? WHERE id=?','sssssi',[$name,$description,$governorate,$area,$address,(int)$farm['id']]);respond(200,'Farm updated.'); }

function farm_locations(): never { require_method('GET');$farm=owned_farm(require_user(['vendor']));respond(200,'Locations retrieved.',db_all('SELECT * FROM farm_locations WHERE farm_id=? AND is_active=1 ORDER BY is_default DESC,updated_at DESC','i',[(int)$farm['id']])); }
function farm_location_save(): never { require_method('POST');$farm=owned_farm(require_user(['vendor']));$label=clean_text('label',120);$address=clean_text('address_text',2000);$default=!db_exists('SELECT 1 FROM farm_locations WHERE farm_id=? AND is_active=1','i',[(int)$farm['id']]);db_statement('INSERT INTO farm_locations (farm_id,label,address_text,is_default) VALUES (?,?,?,?)','issi',[(int)$farm['id'],$label,$address,(int)$default]);respond(201,'Location created.',['id'=>db_insert_id()]); }
function farm_location_default(): never { require_method('POST');$farm=owned_farm(require_user(['vendor']));$id=id_input();if(!db_exists('SELECT 1 FROM farm_locations WHERE id=? AND farm_id=?','ii',[$id,(int)$farm['id']]))fail(404,'Location not found.');db_transaction(function()use($farm,$id){db_statement('UPDATE farm_locations SET is_default=0 WHERE farm_id=?','i',[(int)$farm['id']]);db_statement('UPDATE farm_locations SET is_default=1 WHERE id=?','i',[$id]);});respond(200,'Default location updated.'); }
function farm_location_delete(): never { require_method('DELETE');$farm=owned_farm(require_user(['vendor']));db_statement('UPDATE farm_locations SET is_active=0,is_default=0 WHERE id=? AND farm_id=?','ii',[id_input(),(int)$farm['id']]);respond(200,'Location removed.'); }

function team_list(): never { require_method('GET');$farm=owned_farm(require_user(['vendor']));respond(200,'Team retrieved.',db_all('SELECT id,user_id,full_name,email,phone,role,access_status,accepted_at,created_at FROM farm_team_members WHERE farm_id=? ORDER BY created_at','i',[(int)$farm['id']])); }
function team_invite(): never { require_method('POST');$u=require_user(['vendor']);$farm=owned_farm($u);$name=clean_text('full_name',150);$role=required_enum('role',['order_manager','inventory_manager','support_agent']);$emailRaw=nullable_string('email',191);$phoneRaw=nullable_string('phone',30);if($emailRaw===null&&$phoneRaw===null)fail(422,'Provide an email address or phone number.');$email=$emailRaw===null?null:normalize_email($emailRaw);$phone=$phoneRaw===null?null:normalize_phone($phoneRaw);$token=bin2hex(random_bytes(32));db_statement('INSERT INTO farm_team_members (farm_id,invited_by_user_id,full_name,email,phone,role,invite_token_hash,invite_expires_at) VALUES (?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))','iisssss',[(int)$farm['id'],(int)$u['id'],$name,$email,$phone,$role,hash('sha256',$token)]);respond(201,'Team invitation created.',env_value('APP_ENV')==='local'?['invite_token'=>$token]:null); }
function team_remove(): never { require_method('DELETE');$farm=owned_farm(require_user(['vendor']));db_statement('DELETE FROM farm_team_members WHERE id=? AND farm_id=?','ii',[id_input(),(int)$farm['id']]);respond(200,'Team member removed.'); }

function documents_list(): never { require_method('GET');$farm=owned_farm(require_user(['vendor']));respond(200,'Documents retrieved.',db_all('SELECT id,document_type,document_name,file_url,file_mime_type,expires_at,status,review_note,created_at FROM farm_documents WHERE farm_id=? ORDER BY created_at DESC','i',[(int)$farm['id']])); }
function document_create(): never { require_method('POST');$u=require_user(['vendor']);$farm=owned_farm($u);$type=clean_text('document_type',60);$name=clean_text('document_name',180);$url=required_url('file_url');$mime=clean_text('file_mime_type',100,false);if($mime!==null&&!in_array($mime,['application/pdf','image/jpeg','image/png'],true))fail(422,'Unsupported document file type.');db_statement('INSERT INTO farm_documents (farm_id,uploaded_by_user_id,document_type,document_name,file_url,file_mime_type) VALUES (?,?,?,?,?,?)','iissss',[(int)$farm['id'],(int)$u['id'],$type,$name,$url,$mime]);respond(201,'Document submitted for review.',['id'=>db_insert_id()]); }
function document_delete(): never { require_method('DELETE');$farm=owned_farm(require_user(['vendor']));db_statement('DELETE FROM farm_documents WHERE id=? AND farm_id=? AND status=\'pending\'','ii',[id_input(),(int)$farm['id']]);respond(200,'Document removed.'); }

function notifications_get(): never { require_method('GET');$u=require_user();respond(200,'Notifications retrieved.',db_all('SELECT id,notification_type,title,body,data_json,is_read,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100','i',[(int)$u['id']])); }
function notifications_read(): never { require_method('POST');$u=require_user();$id=id_input();db_statement('UPDATE notifications SET is_read=1,read_at=NOW() WHERE id=? AND user_id=?','ii',[$id,(int)$u['id']]);respond(200,'Notification marked as read.'); }
function preferences_list(): never { require_method('GET');$u=require_user();respond(200,'Notification preferences retrieved.',db_all('SELECT preference_key,is_enabled FROM notification_preferences WHERE user_id=?','i',[(int)$u['id']])); }
function preference_save(): never { require_method('POST');$u=require_user();$key=required_enum('preference_key',['order_updates','messages','market_updates','offers']);$enabled=optional_bool('is_enabled');db_statement('INSERT INTO notification_preferences (user_id,preference_key,is_enabled) VALUES (?,?,?) ON DUPLICATE KEY UPDATE is_enabled=VALUES(is_enabled)','isi',[(int)$u['id'],$key,(int)$enabled]);respond(200,'Notification preference updated.'); }

function payout_account_save(): never { require_method('POST');$farm=owned_farm(require_user(['vendor']));$bank=clean_text('bank_name',150);$holder=clean_text('account_holder_name',150,false);$number=preg_replace('/\s+/', '', required_string('account_number',64))??'';if(!preg_match('/^[A-Za-z0-9]{8,34}$/',$number))fail(422,'account_number is invalid.');$lastFour=substr($number,-4);$encrypted=encrypt_sensitive($number);db_transaction(function()use($farm,$bank,$holder,$encrypted,$lastFour){db_statement('UPDATE payout_accounts SET is_default=0 WHERE farm_id=?','i',[(int)$farm['id']]);db_statement('INSERT INTO payout_accounts (farm_id,bank_name,account_holder_name,account_number_encrypted,account_last_four,is_default) VALUES (?,?,?,?,?,1)','issss',[(int)$farm['id'],$bank,$holder,$encrypted,$lastFour]);});respond(200,'Payout account updated.'); }
function payouts_list(): never { require_method('GET');$farm=owned_farm(require_user(['vendor']));$account=db_one('SELECT id,bank_name,account_holder_name,account_last_four,status FROM payout_accounts WHERE farm_id=? AND is_default=1 LIMIT 1','i',[(int)$farm['id']]);$payouts=db_all('SELECT id,payout_number,currency,gross_amount,fees_amount,net_amount,status,scheduled_for,paid_at FROM payouts WHERE farm_id=? ORDER BY created_at DESC','i',[(int)$farm['id']]);respond(200,'Payouts retrieved.',['account'=>$account,'payouts'=>$payouts]); }

function conversations_list(): never { require_method('GET');$u=require_user();$sql=$u['role']==='vendor'?'SELECT c.*,f.name farm_name FROM conversations c JOIN farms f ON f.id=c.farm_id WHERE f.owner_user_id=?':'SELECT c.*,f.name farm_name FROM conversations c LEFT JOIN farms f ON f.id=c.farm_id WHERE c.buyer_user_id=?';respond(200,'Conversations retrieved.',db_all($sql.' ORDER BY c.last_message_at DESC','i',[(int)$u['id']])); }
function message_send(): never { require_method('POST');$u=require_user();$conversationId=optional_id('conversation_id');$farmId=optional_id('farm_id');$body=clean_text('body',4000);if($conversationId===null){if($u['role']!=='buyer'||$farmId===null||!db_exists('SELECT 1 FROM farms WHERE id=? AND is_active=1','i',[$farmId]))fail(422,'A valid farm_id is required.');db_statement('INSERT INTO conversations (buyer_user_id,farm_id,last_message_at) VALUES (?,?,NOW())','ii',[(int)$u['id'],$farmId]);$conversationId=db_insert_id();}$conversation=db_one('SELECT c.*,f.owner_user_id FROM conversations c LEFT JOIN farms f ON f.id=c.farm_id WHERE c.id=?','i',[$conversationId]);if($conversation===null||((int)$conversation['buyer_user_id']!==(int)$u['id']&&(int)$conversation['owner_user_id']!==(int)$u['id']))fail(403,'You cannot message in this conversation.');db_statement('INSERT INTO messages (conversation_id,sender_user_id,body) VALUES (?,?,?)','iis',[$conversationId,(int)$u['id'],$body]);db_statement('UPDATE conversations SET last_message_at=NOW() WHERE id=?','i',[$conversationId]);respond(201,'Message sent.',['conversation_id'=>$conversationId]); }
function messages_list(): never { require_method('GET');$u=require_user();$id=id_input('conversation_id');$c=db_one('SELECT c.*,f.owner_user_id FROM conversations c LEFT JOIN farms f ON f.id=c.farm_id WHERE c.id=?','i',[$id]);if($c===null||((int)$c['buyer_user_id']!==(int)$u['id']&&(int)$c['owner_user_id']!==(int)$u['id']))fail(403,'You cannot view this conversation.');db_statement('UPDATE messages SET read_at=NOW() WHERE conversation_id=? AND sender_user_id!=? AND read_at IS NULL','ii',[$id,(int)$u['id']]);respond(200,'Messages retrieved.',db_all('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at','i',[$id])); }

function farm_onboard(): never { require_method('POST');$u=require_user(['vendor']);if(db_exists('SELECT 1 FROM farms WHERE owner_user_id=?','i',[(int)$u['id']]))fail(409,'This vendor already has a farm.');$name=clean_text('name',180);$governorate=clean_text('governorate',100);$area=clean_text('area',120,false);$address=clean_text('address_text',2000,false);$types=clean_text('grower_types',2000);$slug=unique_slug('farms',$name);db_statement('INSERT INTO farms (owner_user_id,name,slug,governorate,area,address_text,grower_types,verification_status) VALUES (?,?,?,?,?,?,?,\'pending\')','issssss',[(int)$u['id'],$name,$slug,$governorate,$area,$address,$types]);respond(201,'Farm submitted for verification.',['id'=>db_insert_id(),'verification_status'=>'pending']); }

function product_images_set(): never { require_method('POST');$u=require_user(['vendor']);$farm=owned_farm($u);$productId=id_input('product_id');if(!db_exists('SELECT 1 FROM products WHERE id=? AND farm_id=?','ii',[$productId,(int)$farm['id']]))fail(404,'Product not found.');$images=input('images');if(!is_array($images)||count($images)>8)fail(422,'images must contain between 1 and 8 image URLs.');$clean=[];foreach($images as $index=>$image){if(!is_array($image)||!isset($image['url']))fail(422,'Each image must include a URL.');$url=(string)$image['url'];$parts=parse_url($url);if($parts===false||!isset($parts['scheme'],$parts['host'])||!in_array(strtolower($parts['scheme']),['https','http'],true)||mb_strlen($url)>500)fail(422,'An image URL is invalid.');$alt=isset($image['alt_text'])?trim((string)$image['alt_text']):null;if($alt!==null&&mb_strlen($alt)>255)fail(422,'Image alt text is too long.');$clean[]=[$url,$alt,$index,(int)($index===0)];}db_transaction(function()use($productId,$clean){db_statement('DELETE FROM product_images WHERE product_id=?','i',[$productId]);foreach($clean as [$url,$alt,$index,$primary])db_statement('INSERT INTO product_images (product_id,image_url,alt_text,sort_order,is_primary) VALUES (?,?,?,?,?)','issii',[$productId,$url,$alt,$index,$primary]);});respond(200,'Product images updated.'); }

function appeal_create(): never { require_method('POST');$u=require_user(['buyer']);$orderId=id_input('order_id');$order=db_one('SELECT * FROM orders WHERE id=? AND buyer_user_id=? AND status=\'delivered\'','ii',[$orderId,(int)$u['id']]);if($order===null)fail(422,'Only delivered orders can be appealed.');if(db_exists('SELECT 1 FROM appeals WHERE order_id=? AND status NOT IN (\'resolved\',\'rejected\')','i',[$orderId]))fail(409,'This order already has an open appeal.');$reason=required_enum('reason_type',['quality_issue','missing_item','wrong_item','delivery_issue','other']);$description=clean_text('description',5000);$resolution=clean_text('requested_resolution',100,false);$number='AP-'.date('Ymd').'-'.strtoupper(bin2hex(random_bytes(3)));db_statement('INSERT INTO appeals (appeal_number,order_id,buyer_user_id,farm_id,reason_type,description,requested_resolution) VALUES (?,?,?,?,?,?,?)','siiisss',[$number,$orderId,(int)$u['id'],(int)$order['farm_id'],$reason,$description,$resolution]);$farm=db_one('SELECT owner_user_id FROM farms WHERE id=?','i',[(int)$order['farm_id']]);if($farm!==null)notify_user((int)$farm['owner_user_id'],'appeal','New appeal '.$number,'A buyer needs a response.',['order_id'=>$orderId]);respond(201,'Appeal created.',['id'=>db_insert_id(),'appeal_number'=>$number]); }
function appeals_list(): never { require_method('GET');$u=require_user();$sql=$u['role']==='vendor'?'SELECT a.* FROM appeals a JOIN farms f ON f.id=a.farm_id WHERE f.owner_user_id=?':'SELECT * FROM appeals WHERE buyer_user_id=?';respond(200,'Appeals retrieved.',db_all($sql.' ORDER BY created_at DESC','i',[(int)$u['id']])); }
function appeal_respond(): never { require_method('POST');$u=require_user(['vendor']);$farm=owned_farm($u);$id=id_input('appeal_id');$response=clean_text('vendor_response',5000);$appeal=db_one('SELECT * FROM appeals WHERE id=? AND farm_id=? AND status=\'response_needed\'','ii',[$id,(int)$farm['id']]);if($appeal===null)fail(409,'This appeal cannot be responded to.');db_statement('UPDATE appeals SET vendor_response=?,responded_by_user_id=?,responded_at=NOW(),status=\'vendor_responded\' WHERE id=?','sii',[$response,(int)$u['id'],$id]);notify_user((int)$appeal['buyer_user_id'],'appeal','Appeal '.$appeal['appeal_number'].' has a response','The farm has responded to your appeal.',['appeal_id'=>$id]);respond(200,'Appeal response submitted.'); }

function order_cancel(): never { require_method('POST');$u=require_user(['buyer']);$id=id_input('order_id');$order=db_one('SELECT * FROM orders WHERE id=? AND buyer_user_id=?','ii',[$id,(int)$u['id']]);if($order===null)fail(404,'Order not found.');if(!in_array($order['status'],['new','confirmed'],true))fail(409,'This order can no longer be cancelled.');$reason=clean_text('reason',255,false);db_transaction(function()use($id,$reason,$u){db_statement('UPDATE orders SET status=\'cancelled\',cancelled_at=NOW(),decline_reason=? WHERE id=?','si',[$reason,$id]);db_statement('UPDATE products p JOIN order_items oi ON oi.product_id=p.id SET p.stock_quantity=p.stock_quantity+oi.quantity WHERE oi.order_id=?','i',[$id]);db_statement('INSERT INTO order_status_history (order_id,status,note,changed_by_user_id) VALUES (?,\'cancelled\',?,?)','isi',[$id,$reason,(int)$u['id']]);});respond(200,'Order cancelled.'); }

$routes = [
    'health' => 'health',
    'auth/register' => 'auth_register', 'auth/login' => 'auth_login', 'auth/verify-phone' => 'auth_verify_phone', 'auth/forgot-password' => 'auth_forgot_password', 'auth/reset-password' => 'auth_reset_password',
    'profile/get' => 'profile_get', 'profile/update' => 'profile_update', 'catalog/categories' => 'catalog_categories', 'catalog/products' => 'catalog_products', 'catalog/product' => 'catalog_product',
    'saved/list' => 'saved_list', 'saved/toggle' => 'saved_toggle', 'addresses/list' => 'addresses_list', 'addresses/save' => 'address_save', 'addresses/default' => 'address_default', 'addresses/delete' => 'address_delete',
    'payments/list' => 'payments_list', 'payments/create' => 'payment_create', 'payments/default' => 'payment_default', 'payments/delete' => 'payment_delete',
    'cart/get' => 'cart_get', 'cart/add' => 'cart_add', 'cart/update' => 'cart_update', 'cart/remove' => 'cart_remove', 'cart/note' => 'cart_note', 'orders/checkout' => 'checkout', 'orders/list' => 'orders_list', 'orders/detail' => 'order_detail', 'orders/status' => 'order_status', 'orders/cancel' => 'order_cancel',
    'vendor/products' => 'vendor_products', 'vendor/product/save' => 'vendor_product_save', 'vendor/product/delete' => 'vendor_product_delete', 'vendor/product/images' => 'product_images_set', 'farm/onboard' => 'farm_onboard', 'farm/get' => 'farm_get', 'farm/update' => 'farm_update', 'farm/locations' => 'farm_locations', 'farm/location/save' => 'farm_location_save', 'farm/location/default' => 'farm_location_default', 'farm/location/delete' => 'farm_location_delete',
    'team/list' => 'team_list', 'team/invite' => 'team_invite', 'team/remove' => 'team_remove', 'documents/list' => 'documents_list', 'documents/create' => 'document_create', 'documents/delete' => 'document_delete',
    'notifications/list' => 'notifications_get', 'notifications/read' => 'notifications_read', 'preferences/list' => 'preferences_list', 'preferences/save' => 'preference_save', 'payouts/list' => 'payouts_list', 'payouts/account/save' => 'payout_account_save', 'conversations/list' => 'conversations_list', 'messages/list' => 'messages_list', 'messages/send' => 'message_send', 'appeals/create' => 'appeal_create', 'appeals/list' => 'appeals_list', 'appeals/respond' => 'appeal_respond',
];

try {
    $action = action_name();
    if (!isset($routes[$action])) fail(404, 'Unknown API action.');
    $routes[$action]();
} catch (mysqli_sql_exception $exception) {
    error_log('Database error in proc.php: ' . $exception->getMessage());
    fail(500, 'A database error occurred.');
} catch (Throwable $exception) {
    error_log('API error in proc.php: ' . $exception->getMessage());
    fail(500, 'An unexpected server error occurred.');
}
