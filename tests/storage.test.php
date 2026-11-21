<?php
declare(strict_types=1);

$root = sys_get_temp_dir() . '/refa3y-storage-test-' . bin2hex(random_bytes(8));
$secret = str_repeat('test-secret-', 4);

function env_value(string $name, ?string $default = null): ?string
{
    global $root, $secret;
    return match ($name) {
        'UPLOAD_STORAGE_PATH' => $root,
        'APP_DATA_ENCRYPTION_KEY' => $secret,
        default => $default,
    };
}

function encrypt_sensitive(string $plaintext): string
{
    $iv = random_bytes(12);
    $tag = '';
    $encrypted = openssl_encrypt($plaintext, 'aes-256-gcm', hash('sha256', env_value('APP_DATA_ENCRYPTION_KEY'), true), OPENSSL_RAW_DATA, $iv, $tag);
    if ($encrypted === false) throw new RuntimeException('Encryption failed.');
    return base64_encode($iv . $tag . $encrypted);
}

require __DIR__ . '/../backend/uploads.php';

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

$key = bin2hex(random_bytes(32));
$contents = "private document contents\0binary";
try {
    store_upload($key, $contents);
    $path = upload_path($key);
    check(is_file($path), 'Stored file missing.');
    check(!str_contains((string)file_get_contents($path), $contents), 'File contains plaintext.');
    check(read_upload($key) === $contents, 'Encrypted file did not round-trip.');

    $original = file_get_contents($path);
    file_put_contents($path, base64_encode(str_repeat('x', 30)));
    try {
        read_upload($key);
        throw new RuntimeException('Tampered file was accepted.');
    } catch (RuntimeException $error) {
        check($error->getMessage() === 'Stored upload authentication failed.', 'Unexpected tamper error.');
    }
    file_put_contents($path, $original);
    $secret = str_repeat('wrong-key-', 4);
    try {
        read_upload($key);
        throw new RuntimeException('Wrong key was accepted.');
    } catch (RuntimeException $error) {
        check($error->getMessage() === 'Stored upload authentication failed.', 'Unexpected wrong-key error.');
    }
    try {
        upload_path('../other');
        throw new RuntimeException('Invalid path was accepted.');
    } catch (RuntimeException $error) {
        check($error->getMessage() === 'Invalid storage key.', 'Unexpected path validation error.');
    }
    delete_upload($key);
    check(!is_file($path), 'Stored file was not deleted.');
    echo "Storage encryption, integrity, path validation and deletion passed.\n";
} finally {
    if (isset($path) && is_file($path)) unlink($path);
    if (is_dir($root . '/refa3y')) rmdir($root . '/refa3y');
    if (is_dir($root)) rmdir($root);
}
