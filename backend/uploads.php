<?php
declare(strict_types=1);

const UPLOAD_MAX_BYTES = 5242880;

function upload_directory(): string
{
    $root = env_value('UPLOAD_STORAGE_PATH', dirname(__DIR__) . '/storage');
    $directory = rtrim($root, '/\\') . DIRECTORY_SEPARATOR . 'refa3y';
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        throw new RuntimeException('Upload storage could not be created.');
    }
    if (!is_writable($directory)) throw new RuntimeException('Upload storage is not writable.');
    return $directory;
}

function upload_path(string $key): string
{
    if (!preg_match('/^[a-f0-9]{64}$/', $key)) throw new RuntimeException('Invalid storage key.');
    return upload_directory() . DIRECTORY_SEPARATOR . $key . '.enc';
}

/** @return array{contents:string,mime:string} */
function validated_upload(array $allowed): array
{
    $file = $_FILES['file'] ?? null;
    if (!is_array($file) || !isset($file['error']) || is_array($file['error'])) {
        fail(422, 'Select a file to upload. Check the server post_max_size setting if the file was selected.');
    }
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE) fail(422, 'File exceeds the server upload limit.');
    if ($file['error'] !== UPLOAD_ERR_OK || !isset($file['tmp_name']) || !is_string($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        fail(422, 'The file upload was incomplete. Please try again.');
    }
    $size = filesize($file['tmp_name']);
    if ($size === false || $size < 1 || $size > UPLOAD_MAX_BYTES) fail(422, 'Choose a non-empty file no larger than 5 MB.');
    if (!class_exists('finfo')) throw new RuntimeException('PHP fileinfo is required for uploads.');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!is_string($mime) || !in_array($mime, $allowed, true)) fail(422, 'Unsupported file type.');
    if (str_starts_with($mime, 'image/') && @getimagesize($file['tmp_name']) === false) fail(422, 'The image file is invalid.');
    $contents = file_get_contents($file['tmp_name']);
    if ($contents === false || strlen($contents) !== $size) throw new RuntimeException('Uploaded file could not be read.');
    return ['contents' => $contents, 'mime' => $mime];
}

function store_upload(string $key, string $contents): void
{
    $encrypted = encrypt_sensitive($contents);
    $file = fopen(upload_path($key), 'xb');
    if ($file === false) throw new RuntimeException('Upload file could not be created.');
    try {
        $written = fwrite($file, $encrypted);
        if ($written !== strlen($encrypted) || !fflush($file)) throw new RuntimeException('Upload file could not be written.');
    } catch (Throwable $exception) {
        fclose($file);
        delete_upload($key);
        throw $exception;
    }
    fclose($file);
}

function delete_upload(string $key): void
{
    $path = upload_path($key);
    if (is_file($path) && !unlink($path)) throw new RuntimeException('Stored upload could not be removed.');
}

function delete_committed_upload(string $key, string $message): void
{
    try {
        delete_upload($key);
    } catch (Throwable $exception) {
        api_log_exception('Upload cleanup failed', $exception);
        fail(500, $message . ' The stored file could not be removed; contact the server administrator.');
    }
}

function read_upload(string $key): string
{
    $path = upload_path($key);
    $encrypted = is_file($path) ? file_get_contents($path) : false;
    if ($encrypted === false) throw new RuntimeException('Stored upload could not be read.');
    $data = base64_decode($encrypted, true);
    $secret = env_value('APP_DATA_ENCRYPTION_KEY');
    if ($data === false || strlen($data) < 28 || $secret === null || strlen($secret) < 32 || !function_exists('openssl_decrypt')) {
        throw new RuntimeException('Stored upload cannot be decrypted.');
    }
    $plaintext = openssl_decrypt(substr($data, 28), 'aes-256-gcm', hash('sha256', $secret, true), OPENSSL_RAW_DATA, substr($data, 0, 12), substr($data, 12, 16));
    if ($plaintext === false) throw new RuntimeException('Stored upload authentication failed.');
    return $plaintext;
}

function output_upload(string $contents, string $mime, string $disposition): never
{
    api_discard_output();
    $GLOBALS['api_responded'] = true;
    header('Content-Type: ' . $mime);
    header('Content-Disposition: ' . $disposition);
    header('Content-Length: ' . strlen($contents));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store');
    echo $contents;
    exit;
}

function product_image_upload(): never
{
    require_method('POST');
    $farm = owned_farm(require_user(['vendor']));
    $productId = id_input('product_id');
    $file = validated_upload(['image/jpeg', 'image/png']);
    $key = bin2hex(random_bytes(32));
    $url = '?action=media%2Fproduct&key=' . $key;
    $stored = false;
    try {
        $imageId = db_transaction(function () use ($farm, $productId, $file, $key, $url, &$stored) {
            if (db_one('SELECT id FROM products WHERE id=? AND farm_id=? FOR UPDATE', 'ii', [$productId, (int)$farm['id']]) === null) fail(404, 'Product not found.');
            $count = (int)db_one('SELECT COUNT(*) AS count FROM product_images WHERE product_id=?', 'i', [$productId])['count'];
            if ($count >= 8) fail(422, 'A product can have at most 8 photos.');
            store_upload($key, $file['contents']);
            $stored = true;
            db_statement('UPDATE product_images SET is_primary=0 WHERE product_id=?', 'i', [$productId]);
            db_statement('INSERT INTO product_images (product_id,image_url,sort_order,is_primary) VALUES (?,?,?,1)', 'isi', [$productId, $url, $count]);
            return db_insert_id();
        });
    } catch (Throwable $exception) {
        if ($stored) delete_upload($key);
        throw $exception;
    }
    respond(201, 'Product photo uploaded.', ['id' => $imageId, 'image_url' => $url]);
}

function product_images_list(): never
{
    require_method('GET');
    $farm = owned_farm(require_user(['vendor']));
    $productId = id_input('product_id');
    if (!db_exists('SELECT 1 FROM products WHERE id=? AND farm_id=?', 'ii', [$productId, (int)$farm['id']])) fail(404, 'Product not found.');
    respond(200, 'Product photos retrieved.', db_all('SELECT id,image_url,is_primary FROM product_images WHERE product_id=? ORDER BY is_primary DESC,sort_order,id', 'i', [$productId]));
}

function product_image_delete(): never
{
    require_method('DELETE');
    $farm = owned_farm(require_user(['vendor']));
    $productId = id_input('product_id');
    $imageId = id_input('image_id');
    $result = db_transaction(function () use ($farm, $productId, $imageId) {
        if (db_one('SELECT id FROM products WHERE id=? AND farm_id=? FOR UPDATE', 'ii', [$productId, (int)$farm['id']]) === null) fail(404, 'Product not found.');
        $image = db_one('SELECT image_url,is_primary FROM product_images WHERE id=? AND product_id=?', 'ii', [$imageId, $productId]);
        if ($image === null) fail(404, 'Photo not found.');
        db_statement('DELETE FROM product_images WHERE id=?', 'i', [$imageId]);
        if ((int)$image['is_primary'] === 1) {
            $next = db_one('SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order,id LIMIT 1', 'i', [$productId]);
            if ($next !== null) db_statement('UPDATE product_images SET is_primary=1 WHERE id=?', 'i', [(int)$next['id']]);
        }
        return ['url' => $image['image_url'], 'images' => db_all('SELECT id,image_url,is_primary FROM product_images WHERE product_id=? ORDER BY is_primary DESC,sort_order,id', 'i', [$productId])];
    });
    if (preg_match('/^\?action=media%2Fproduct&key=([a-f0-9]{64})$/', $result['url'], $matches) && !db_exists('SELECT 1 FROM product_images WHERE image_url=?', 's', [$result['url']])) {
        delete_committed_upload($matches[1], 'The photo was removed from the product.');
    }
    respond(200, 'Product photo removed.', $result['images']);
}

function product_image_media(): never
{
    require_method('GET');
    $key = (string)query_param('key', '');
    if (!preg_match('/^[a-f0-9]{64}$/', $key)) fail(404, 'Image not found.');
    $url = '?action=media%2Fproduct&key=' . $key;
    if (!db_exists('SELECT 1 FROM product_images WHERE image_url=?', 's', [$url])) fail(404, 'Image not found.');
    $contents = read_upload($key);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    if (!in_array($mime, ['image/jpeg', 'image/png'], true)) throw new RuntimeException('Stored image type is invalid.');
    output_upload($contents, $mime, 'inline');
}

function document_upload(): never
{
    require_method('POST');
    $user = require_user(['vendor']);
    $farm = owned_farm($user);
    $type = clean_text('document_type', 60);
    $name = clean_text('document_name', 180);
    $file = validated_upload(['application/pdf', 'image/jpeg', 'image/png']);
    $key = bin2hex(random_bytes(32));
    $stored = false;
    try {
        db_transaction(function () use ($farm, $user, $type, $name, $file, $key, &$stored) {
            store_upload($key, $file['contents']);
            $stored = true;
            db_statement('INSERT INTO farm_documents (farm_id,uploaded_by_user_id,document_type,document_name,file_url,file_mime_type) VALUES (?,?,?,?,?,?)', 'iissss', [(int)$farm['id'], (int)$user['id'], $type, $name, 'local-private:' . $key, $file['mime']]);
        });
    } catch (Throwable $exception) {
        if ($stored) delete_upload($key);
        throw $exception;
    }
    respond(201, 'Document submitted for review.', ['id' => db_insert_id()]);
}

function document_download(): never
{
    require_method('GET');
    $farm = owned_farm(require_user(['vendor']));
    $document = db_one('SELECT file_url,file_mime_type FROM farm_documents WHERE id=? AND farm_id=?', 'ii', [id_input(), (int)$farm['id']]);
    if ($document === null || !preg_match('/^local-private:([a-f0-9]{64})$/', $document['file_url'], $matches)) fail(404, 'Document not found.');
    if (!in_array($document['file_mime_type'], ['application/pdf', 'image/jpeg', 'image/png'], true)) throw new RuntimeException('Stored document type is invalid.');
    output_upload(read_upload($matches[1]), $document['file_mime_type'], 'attachment; filename="document"');
}
