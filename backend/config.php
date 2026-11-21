<?php
declare(strict_types=1);

/* Shared bootstrap and utilities for backend/proc.php.
 * Configure DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD in the server
 * environment when the local XAMPP defaults are not appropriate. */

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

const API_MAX_PAGE_SIZE = 100;
const API_DEFAULT_PAGE_SIZE = 20;

/** Values from an optional, untracked backend/.env file (KEY=value per line); real environment variables win. */
function env_file_values(): array
{
    static $values = null;
    if ($values !== null) return $values;
    $values = [];
    $path = __DIR__ . '/.env';
    if (!is_readable($path)) return $values;
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        $values[trim($key)] = trim($value, " \t\"'");
    }
    return $values;
}

function env_value(string $name, ?string $default = null): ?string
{
    $value = getenv($name);
    if ($value === false || $value === '') $value = env_file_values()[$name] ?? '';
    return $value === '' ? $default : $value;
}

function configure_api_headers(): void
{
    if (headers_sent()) return;

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $origins = array_filter(array_map('trim', explode(',', env_value('CORS_ALLOWED_ORIGINS', '*') ?? '*')));
    $allowedOrigin = in_array('*', $origins, true) ? '*' : (in_array($origin, $origins, true) ? $origin : '');

    header('Content-Type: application/json; charset=utf-8');
    if ($allowedOrigin !== '') {
        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');

    if (request_method() === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function api_request_id(): string
{
    static $id = null;
    return $id ??= bin2hex(random_bytes(4));
}

/** Appends a line to backend/logs/api.log (or the PHP error log if the file is not writable). Never log secrets. */
function api_log(string $level, string $message, array $context = []): void
{
    $line = sprintf(
        '[%s] [%s] [%s] %s %s %s%s',
        date('Y-m-d H:i:s'),
        strtoupper($level),
        api_request_id(),
        request_method(),
        $_SERVER['REQUEST_URI'] ?? '',
        $message,
        $context === [] ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR)
    );
    $dir = __DIR__ . '/logs';
    if ((is_dir($dir) || @mkdir($dir, 0775, true)) && @file_put_contents($dir . '/api.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX) !== false) return;
    error_log($line);
}

function api_log_exception(string $label, Throwable $exception): void
{
    api_log('error', $label . ': ' . get_class($exception) . ': ' . $exception->getMessage(), [
        'at' => basename($exception->getFile()) . ':' . $exception->getLine(),
        'trace' => array_slice(explode("\n", $exception->getTraceAsString()), 0, 8),
    ]);
}

function api_debug_enabled(): bool { return env_value('API_DEBUG') === '1'; }

function api_discard_output(): void
{
    while (ob_get_level() > 0) {
        $stray = (string) ob_get_clean();
        if (trim($stray) !== '') api_log('warning', 'Discarded unexpected output before JSON response.', ['output' => mb_substr($stray, 0, 500)]);
    }
}

/** Always emits a clean JSON envelope; stray PHP output (warnings, notices, BOMs) is logged and dropped. */
function respond(int $status, string $message, mixed $data = null, array $extra = []): void
{
    $GLOBALS['api_responded'] = true;
    api_discard_output();
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Request-Id: ' . api_request_id());
    }
    if ($status >= 400) api_log($status >= 500 ? 'error' : 'warn', "Responded {$status}: {$message}", $extra['errors'] ?? []);
    $json = json_encode(array_merge(['status' => $status, 'message' => $message, 'data' => $data, 'request_id' => api_request_id()], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    echo $json !== false ? $json : '{"status":500,"message":"Failed to encode the response.","data":null}';
    exit;
}

function fail(int $status, string $message, array $errors = []): void
{
    respond($status, $message, null, $errors === [] ? [] : ['errors' => $errors]);
}

/** Converts every PHP failure into a logged JSON response instead of HTML/plain text. */
function bootstrap_error_handling(): void
{
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ob_start();

    set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
        if (!(error_reporting() & $severity)) return false;
        api_log('warn', "PHP {$message}", ['at' => basename($file) . ':' . $line]);
        return true;
    });

    register_shutdown_function(static function (): void {
        if (!empty($GLOBALS['api_responded'])) return;
        $error = error_get_last();
        if ($error === null || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR], true)) return;
        api_log('error', 'Fatal PHP error: ' . $error['message'], ['at' => basename($error['file']) . ':' . $error['line']]);
        respond(500, 'An unexpected server error occurred.', null, api_debug_enabled() ? ['debug' => $error['message']] : []);
    });
}

bootstrap_error_handling();

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function require_method(string|array $methods): void
{
    $methods = array_map('strtoupper', (array) $methods);
    if (!in_array(request_method(), $methods, true)) fail(405, 'Method not allowed.', ['allowed_methods' => $methods]);
}

/** @return array<string, mixed> */
function request_data(): array
{
    static $data = null;
    if ($data !== null) return $data;

    $data = $_POST;
    $contentType = strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]);
    if (!in_array($contentType, ['application/json', 'text/json'], true)) return $data;

    $body = trim((string) file_get_contents('php://input'));
    if ($body === '') return $data;
    try {
        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        fail(400, 'Request body must be valid JSON.');
    }
    if (!is_array($decoded)) fail(400, 'The JSON request body must be an object.');
    return $data = $decoded;
}

function input(string $key, mixed $default = null): mixed
{
    $data = request_data();
    return $data[$key] ?? $default;
}

function query_param(string $key, mixed $default = null): mixed
{
    return $_GET[$key] ?? $default;
}

function required_string(string $key, int $maxLength = 0): string
{
    $value = trim((string) input($key, ''));
    if ($value === '') fail(422, "{$key} is required.", [$key => 'Required.']);
    if ($maxLength > 0 && mb_strlen($value) > $maxLength) fail(422, "{$key} is too long.", [$key => "Must be at most {$maxLength} characters."]);
    return $value;
}

function nullable_string(string $key, int $maxLength = 0): ?string
{
    $value = input($key);
    if ($value === null || trim((string) $value) === '') return null;
    $value = trim((string) $value);
    if ($maxLength > 0 && mb_strlen($value) > $maxLength) fail(422, "{$key} is too long.", [$key => "Must be at most {$maxLength} characters."]);
    return $value;
}

function required_int(string $key, int $min = 1): int
{
    $validated = filter_var(input($key), FILTER_VALIDATE_INT);
    if ($validated === false || $validated < $min) fail(422, "{$key} is invalid.", [$key => "Must be an integer of at least {$min}."]);
    return $validated;
}

function required_decimal(string $key, float $min = 0.0): float
{
    $value = input($key);
    if (!is_numeric($value) || (float) $value < $min) fail(422, "{$key} is invalid.", [$key => "Must be a number of at least {$min}."]);
    return (float) $value;
}

function required_enum(string $key, array $allowed): string
{
    $value = required_string($key);
    if (!in_array($value, $allowed, true)) fail(422, "{$key} is invalid.", [$key => 'Allowed values: ' . implode(', ', $allowed)]);
    return $value;
}

function normalize_phone(string $phone): string
{
    $phone = preg_replace('/[\s\-\(\)\.]/', '', trim($phone)) ?? '';
    if (str_starts_with($phone, '00')) $phone = '+' . substr($phone, 2);
    if (!preg_match('/^\+?[1-9][0-9]{6,14}$/', $phone)) fail(422, 'phone is invalid.', ['phone' => 'Use an international phone number.']);
    return str_starts_with($phone, '+') ? $phone : '+' . $phone;
}

function normalize_email(string $email): string
{
    $email = strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 191) fail(422, 'email is invalid.', ['email' => 'Enter a valid email address.']);
    return $email;
}

function slugify(string $value): string
{
    $value = strtolower(trim($value));
    return trim(preg_replace('/[^\p{L}\p{N}]+/u', '-', $value) ?? '', '-');
}

function db(): mysqli
{
    static $connection = null;
    if ($connection instanceof mysqli) return $connection;
    try {
        $connection = new mysqli(env_value('DB_HOST', 'localhost'), env_value('DB_USER', 'root'), env_value('DB_PASSWORD', ''), env_value('DB_NAME', 'refa3y'), (int) env_value('DB_PORT', '3306'));
        $connection->set_charset('utf8mb4');
    } catch (mysqli_sql_exception) {
        fail(500, 'Database connection failed.');
    }
    return $connection;
}

/** Runs a prepared statement. Types use mysqli notation: i, d, s, b. */
function db_statement(string $sql, string $types = '', array $values = []): mysqli_stmt
{
    if (strlen($types) !== count($values)) throw new InvalidArgumentException('The number of query types must match the number of values.');
    $statement = db()->prepare($sql);
    if ($types !== '') {
        $parameters = [$types];
        foreach ($values as $index => $value) $parameters[] = &$values[$index];
        $statement->bind_param(...$parameters);
    }
    $statement->execute();
    return $statement;
}

/** @return array<string, mixed>|null */
function db_one(string $sql, string $types = '', array $values = []): ?array
{
    $row = db_statement($sql, $types, $values)->get_result()->fetch_assoc();
    return $row === null ? null : $row;
}

/** @return list<array<string, mixed>> */
function db_all(string $sql, string $types = '', array $values = []): array
{
    return db_statement($sql, $types, $values)->get_result()->fetch_all(MYSQLI_ASSOC);
}

function db_exists(string $sql, string $types = '', array $values = []): bool
{
    return db_one($sql, $types, $values) !== null;
}

function db_insert_id(): int { return (int) db()->insert_id; }

function db_transaction(callable $callback): mixed
{
    $connection = db();
    $connection->begin_transaction();
    try {
        $result = $callback($connection);
        $connection->commit();
        return $result;
    } catch (Throwable $exception) {
        $connection->rollback();
        throw $exception;
    }
}

/** @return array{page: int, per_page: int, offset: int} */
function pagination(): array
{
    $page = filter_var(query_param('page', 1), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 1;
    $perPage = filter_var(query_param('per_page', API_DEFAULT_PAGE_SIZE), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: API_DEFAULT_PAGE_SIZE;
    $perPage = min($perPage, API_MAX_PAGE_SIZE);
    return ['page' => $page, 'per_page' => $perPage, 'offset' => ($page - 1) * $perPage];
}

/** Encrypts data that must never be stored in plaintext (for example payout details). */
function encrypt_sensitive(string $plaintext): string
{
    $secret = env_value('APP_DATA_ENCRYPTION_KEY');
    if ($secret === null || strlen($secret) < 32 || !function_exists('openssl_encrypt')) {
        throw new RuntimeException('Sensitive-data encryption is not configured.');
    }
    $iv = random_bytes(12);
    $tag = '';
    $ciphertext = openssl_encrypt($plaintext, 'aes-256-gcm', hash('sha256', $secret, true), OPENSSL_RAW_DATA, $iv, $tag);
    if ($ciphertext === false) throw new RuntimeException('Sensitive-data encryption failed.');
    return base64_encode($iv . $tag . $ciphertext);
}

configure_api_headers();

// Backwards-compatible connection variable for proc.php endpoint code.
$conn = db();
