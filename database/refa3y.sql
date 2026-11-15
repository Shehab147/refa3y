-- Refa3y marketplace database for MySQL / MariaDB (phpMyAdmin / XAMPP).
-- No FOREIGN KEY constraints or cascading rules are defined.
-- Columns ending in _id are logical references your backend must validate.

CREATE DATABASE IF NOT EXISTS `refa3y`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `refa3y`;

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(30) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'buyer',
  `avatar_url` VARCHAR(500) NULL,
  `is_phone_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `verification_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `phone` VARCHAR(30) NOT NULL,
  `purpose` VARCHAR(40) NOT NULL,
  `code_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `consumed_at` DATETIME NULL,
  `attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_verification_phone_purpose` (`phone`, `purpose`),
  KEY `idx_verification_user_id` (`user_id`),
  KEY `idx_verification_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `farms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_user_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(191) NULL,
  `public_description` TEXT NULL,
  `governorate` VARCHAR(100) NULL,
  `area` VARCHAR(120) NULL,
  `address_text` TEXT NULL,
  `latitude` DECIMAL(10,7) NULL,
  `longitude` DECIMAL(10,7) NULL,
  `grower_types` TEXT NULL COMMENT 'Backend-managed list, e.g. vegetables, fruit, dairy',
  `avatar_url` VARCHAR(500) NULL,
  `cover_image_url` VARCHAR(500) NULL,
  `verification_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_farms_slug` (`slug`),
  KEY `idx_farms_owner_user_id` (`owner_user_id`),
  KEY `idx_farms_status_active` (`verification_status`, `is_active`),
  KEY `idx_farms_location` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `farm_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `uploaded_by_user_id` BIGINT UNSIGNED NOT NULL,
  `document_type` VARCHAR(60) NOT NULL,
  `document_name` VARCHAR(180) NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `file_mime_type` VARCHAR(100) NULL,
  `expires_at` DATE NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `reviewed_by_user_id` BIGINT UNSIGNED NULL,
  `reviewed_at` DATETIME NULL,
  `review_note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farm_documents_farm_status` (`farm_id`, `status`),
  KEY `idx_farm_documents_uploaded_by` (`uploaded_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `farm_locations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `address_text` TEXT NOT NULL,
  `governorate` VARCHAR(100) NULL,
  `area` VARCHAR(120) NULL,
  `latitude` DECIMAL(10,7) NULL,
  `longitude` DECIMAL(10,7) NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farm_locations_farm_active` (`farm_id`, `is_active`),
  KEY `idx_farm_locations_coordinates` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `farm_team_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `invited_by_user_id` BIGINT UNSIGNED NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(30) NULL,
  `role` VARCHAR(40) NOT NULL,
  `access_status` VARCHAR(30) NOT NULL DEFAULT 'invited',
  `invite_token_hash` VARCHAR(255) NULL,
  `invite_expires_at` DATETIME NULL,
  `accepted_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_team_farm_status` (`farm_id`, `access_status`),
  KEY `idx_team_user_id` (`user_id`),
  KEY `idx_team_invite_token` (`invite_token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `icon_name` VARCHAR(100) NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
  `selling_unit` VARCHAR(30) NOT NULL,
  `stock_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `stock_unit` VARCHAR(30) NOT NULL,
  `farming_method` VARCHAR(100) NULL,
  `quality_tag` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `published_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_farm_slug` (`farm_id`, `slug`),
  KEY `idx_products_farm_active` (`farm_id`, `is_active`),
  KEY `idx_products_category_active` (`category_id`, `is_active`),
  KEY `idx_products_name` (`name`),
  KEY `idx_products_farming_method` (`farming_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `alt_text` VARCHAR(255) NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_images_product_sort` (`product_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `buyer_addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `recipient_name` VARCHAR(150) NULL,
  `recipient_phone` VARCHAR(30) NULL,
  `address_text` TEXT NOT NULL,
  `governorate` VARCHAR(100) NULL,
  `area` VARCHAR(120) NULL,
  `building` VARCHAR(100) NULL,
  `floor` VARCHAR(50) NULL,
  `apartment` VARCHAR(50) NULL,
  `latitude` DECIMAL(10,7) NULL,
  `longitude` DECIMAL(10,7) NULL,
  `delivery_notes` TEXT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_buyer_addresses_user_default` (`user_id`, `is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `provider` VARCHAR(80) NOT NULL DEFAULT 'manual',
  `method_type` VARCHAR(30) NOT NULL,
  `card_brand` VARCHAR(40) NULL,
  `card_last_four` CHAR(4) NULL,
  `card_expiry_month` TINYINT UNSIGNED NULL,
  `card_expiry_year` SMALLINT UNSIGNED NULL,
  `provider_customer_id` VARCHAR(191) NULL,
  `provider_payment_method_id` VARCHAR(191) NULL,
  `display_label` VARCHAR(180) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_methods_user_active` (`user_id`, `is_active`),
  KEY `idx_payment_methods_provider_id` (`provider_payment_method_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `carts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
  `note` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_carts_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cart_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_items_cart_product` (`cart_id`, `product_id`),
  KEY `idx_cart_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `delivery_windows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id` BIGINT UNSIGNED NULL,
  `label` VARCHAR(120) NOT NULL,
  `starts_at` DATETIME NOT NULL,
  `ends_at` DATETIME NOT NULL,
  `capacity` INT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delivery_windows_farm_active` (`farm_id`, `is_active`),
  KEY `idx_delivery_windows_time` (`starts_at`, `ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(40) NOT NULL,
  `buyer_user_id` BIGINT UNSIGNED NOT NULL,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `delivery_address_id` BIGINT UNSIGNED NULL,
  `payment_method_id` BIGINT UNSIGNED NULL,
  `delivery_window_id` BIGINT UNSIGNED NULL,
  `delivery_address_snapshot` TEXT NOT NULL,
  `buyer_name_snapshot` VARCHAR(150) NOT NULL,
  `buyer_phone_snapshot` VARCHAR(30) NOT NULL,
  `delivery_window_label` VARCHAR(120) NULL,
  `note` TEXT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'new',
  `payment_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `payment_provider` VARCHAR(80) NULL,
  `payment_reference` VARCHAR(191) NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
  `subtotal_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `service_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `placed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` DATETIME NULL,
  `prepared_at` DATETIME NULL,
  `ready_at` DATETIME NULL,
  `out_for_delivery_at` DATETIME NULL,
  `delivered_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `declined_at` DATETIME NULL,
  `decline_reason` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_order_number` (`order_number`),
  KEY `idx_orders_buyer_status` (`buyer_user_id`, `status`),
  KEY `idx_orders_farm_status` (`farm_id`, `status`),
  KEY `idx_orders_placed_at` (`placed_at`),
  KEY `idx_orders_payment_reference` (`payment_reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NULL,
  `product_name_snapshot` VARCHAR(180) NOT NULL,
  `product_image_url_snapshot` VARCHAR(500) NULL,
  `selling_unit_snapshot` VARCHAR(30) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `line_total` DECIMAL(12,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_order_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(40) NOT NULL,
  `note` VARCHAR(500) NULL,
  `changed_by_user_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_history_order_created` (`order_id`, `created_at`),
  KEY `idx_order_history_changed_by` (`changed_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `saved_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saved_products_user_product` (`user_id`, `product_id`),
  KEY `idx_saved_products_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_type` VARCHAR(30) NOT NULL DEFAULT 'buyer_farm',
  `buyer_user_id` BIGINT UNSIGNED NULL,
  `farm_id` BIGINT UNSIGNED NULL,
  `support_owner_user_id` BIGINT UNSIGNED NULL,
  `order_id` BIGINT UNSIGNED NULL,
  `subject` VARCHAR(255) NULL,
  `last_message_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversations_buyer_latest` (`buyer_user_id`, `last_message_at`),
  KEY `idx_conversations_farm_latest` (`farm_id`, `last_message_at`),
  KEY `idx_conversations_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT UNSIGNED NOT NULL,
  `sender_user_id` BIGINT UNSIGNED NOT NULL,
  `body` TEXT NOT NULL,
  `attachment_url` VARCHAR(500) NULL,
  `attachment_mime_type` VARCHAR(100) NULL,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation_created` (`conversation_id`, `created_at`),
  KEY `idx_messages_sender_user_id` (`sender_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_preferences` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `preference_key` VARCHAR(60) NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notification_preferences_user_key` (`user_id`, `preference_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `notification_type` VARCHAR(60) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NULL,
  `data_json` TEXT NULL COMMENT 'Backend-managed JSON payload',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read_created` (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `appeals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `appeal_number` VARCHAR(40) NOT NULL,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `buyer_user_id` BIGINT UNSIGNED NOT NULL,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `reason_type` VARCHAR(60) NOT NULL,
  `description` TEXT NOT NULL,
  `requested_resolution` VARCHAR(100) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'response_needed',
  `vendor_response` TEXT NULL,
  `responded_by_user_id` BIGINT UNSIGNED NULL,
  `responded_at` DATETIME NULL,
  `resolution_note` TEXT NULL,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `resolved_by_user_id` BIGINT UNSIGNED NULL,
  `resolved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_appeals_number` (`appeal_number`),
  KEY `idx_appeals_order_id` (`order_id`),
  KEY `idx_appeals_farm_status` (`farm_id`, `status`),
  KEY `idx_appeals_buyer_status` (`buyer_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `appeal_evidence` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `appeal_id` BIGINT UNSIGNED NOT NULL,
  `uploaded_by_user_id` BIGINT UNSIGNED NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `file_mime_type` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appeal_evidence_appeal_id` (`appeal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payout_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `bank_name` VARCHAR(150) NOT NULL,
  `account_holder_name` VARCHAR(150) NULL,
  `account_number_encrypted` TEXT NOT NULL,
  `account_last_four` CHAR(4) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payout_accounts_farm_status` (`farm_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payouts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payout_number` VARCHAR(40) NOT NULL,
  `farm_id` BIGINT UNSIGNED NOT NULL,
  `payout_account_id` BIGINT UNSIGNED NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EGP',
  `gross_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fees_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `scheduled_for` DATE NULL,
  `paid_at` DATETIME NULL,
  `provider_reference` VARCHAR(191) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payouts_number` (`payout_number`),
  KEY `idx_payouts_farm_status` (`farm_id`, `status`),
  KEY `idx_payouts_scheduled_for` (`scheduled_for`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the categories shown in the mobile app. These are safe to remove or edit.
INSERT INTO `categories` (`name`, `slug`, `icon_name`, `sort_order`) VALUES
  ('Vegetables', 'vegetables', 'leaf.fill', 1),
  ('Fruit', 'fruit', 'carrot.fill', 2),
  ('Herbs', 'herbs', 'leaf.fill', 3),
  ('Dairy', 'dairy', 'drop.fill', 4),
  ('Pantry', 'pantry', 'shippingbox.fill', 5)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `icon_name` = VALUES(`icon_name`), `sort_order` = VALUES(`sort_order`);
