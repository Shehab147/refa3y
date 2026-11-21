# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

### XAMPP authentication

The API uses the `Authorization: Bearer …` request header. Copy the updated
`backend/proc.php`, `backend/config.php`, and `backend/uploads.php` to the XAMPP API directory and
ensure `EXPO_PUBLIC_API_URL` points to that API. PHP must receive the
Authorization header; Apache/PHP-FastCGI installations may require forwarding
it in the Apache configuration, for example:

```apacheconf
SetEnvIf Authorization "(.+)" HTTP_AUTHORIZATION=$1
```

Enable `mod_setenvif` if necessary and restart Apache after changing its
configuration. If the app reports `Authentication is required`, its development
console includes `authorizationSent: true` or `false`, never the token itself.
`true` means the app included a token; check Apache or any reverse proxy for
header forwarding. `false` means no token was available: sign in again. Web
sessions are kept in memory and require signing in again after a page reload.
Never share a token, password, or Authorization header when reporting an issue.

On iOS and Android the app stores the session token in secure storage and
restores it on launch. A temporary connection or server failure does not erase
the saved token; retry restoration or choose to sign in instead. Signing out
removes the stored token. Tokens currently expire after 30 days, after which
sign-in is required again.

### Vendor API features

The vendor dashboard, orders, appeals, payouts, inventory, and farm locations
load from the backend. Status changes and appeal responses require the updated
`backend/proc.php`; these changes do not require a database migration when
`database/refa3y.sql` is already installed. Team invitation delivery and vendor
support contact are not yet integrated.

### XAMPP file uploads

Deploy `proc.php`, `config.php`, and `uploads.php` together to
`C:\xampp\htdocs\api\`. Uploaded product photos and farm documents are stored
encrypted in `C:\xampp\htdocs\storage\refa3y\` by default. Create that folder
and grant the Apache/PHP service account permission to read and write it.
Alternatively set `UPLOAD_STORAGE_PATH` in `api/.env` to an absolute path
(the API creates a `refa3y` subdirectory there).

Set `APP_DATA_ENCRYPTION_KEY` to a stable secret of at least 32 characters in
`api/.env`, keep that file private, and back up the key securely with the
storage and database. Do not change or lose the key: existing encrypted files
and payout details will become unreadable. PHP needs the OpenSSL and fileinfo
extensions. In `php.ini`, set `upload_max_filesize` to at least `5M` and
`post_max_size` to a larger value such as `6M`, then restart Apache. The app
accepts JPEG/PNG product photos and PDF/JPEG/PNG documents up to 5 MiB.

Even though files are encrypted, deny direct web access to the entire storage
directory in Apache configuration (not just `.htaccess` unless overrides are
enabled). This example applies to XAMPP; restart Apache after changing it:

```apacheconf
<Directory "C:/xampp/htdocs/storage">
    Require all denied
</Directory>
```

Product photos are delivered publicly through the API. Farm documents are
downloadable through `documents/download` only by their authenticated farm
owner; the existing review/admin interface is not implemented here. Legacy
documents supplied as external URLs are not encrypted by this upload feature.
Choose a photo while creating a product or add photos later in the editor; the
latest uploaded photo is the main one, and photos can be removed in the editor. The existing
`product_images` and `farm_documents` tables are used without a migration.
Use HTTPS in production and rebuild the app if the new native picker is not
present in your development build.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
