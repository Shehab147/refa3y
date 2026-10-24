# Refa3y Application Structure

## What Refa3y is

Refa3y is a marketplace that connects farmers and agricultural vendors directly with buyers looking for fresh, trusted produce.

The application has three clearly separated areas:

1. Account access and registration
2. The buyer experience
3. The vendor experience

Buyers and vendors use different workspaces because they have different goals. A buyer shops and follows deliveries, while a vendor manages products, orders, customers, and farm performance.

## Account access

Everyone starts with the same welcome experience. From there, a person can create an account or sign in.

### New buyer journey

```text
Welcome
→ Create account
→ Enter personal information
→ Verify phone number
→ Enter the buyer marketplace
```

### New vendor journey

```text
Welcome
→ Create account
→ Choose “I’m selling”
→ Enter farm information
→ Add verification documents
→ Verify phone number
→ Enter the vendor workspace
```

### Returning user journey

A returning user signs in and enters the appropriate buyer or vendor workspace.

The account area also includes phone verification, forgotten-password recovery, and password replacement.

## Buyer experience

The buyer experience is organized around five main areas.

### Home

The home page helps buyers quickly discover useful products. It includes:

- A welcome message
- Search
- Seasonal highlights
- Product categories
- Nearby produce
- Suggested products
- A recent-order shortcut

### Market

The market is the main shopping area. Buyers can:

- Search for products and farms
- Browse agricultural categories
- Filter products by distance and growing method
- Review product availability
- Open a product to see full details
- Access their basket

### Product details

Each product page explains what the buyer is purchasing before it is added to the basket.

It includes:

- Product photography
- Name and price
- Harvest information
- Product description
- Farm details
- Farm verification status
- Buyer rating
- Quantity selection
- Final price
- Save-product option
- Add-to-basket action

### Basket and checkout

The complete ordering journey is:

```text
Choose product
→ Select quantity
→ Add to basket
→ Review basket
→ Choose delivery address
→ Choose delivery time
→ Choose payment method
→ Review charges
→ Place order
→ Receive confirmation
```

The basket shows products from the farm, quantities, prices, and a shortcut to add a note.

Checkout includes:

- Delivery address
- Delivery window
- Basket summary
- Product subtotal
- Delivery cost
- Service fee
- Final total
- Payment method
- Final order action

Once the order is placed, the buyer receives an order number and expected delivery window.

### Orders

The orders area separates active and completed purchases.

Each order can show:

- Farm name
- Current status
- Delivery estimate
- Purchased items
- Total price
- Preparation and delivery timeline
- Message-farm option
- Cancellation availability

Cancellation is only offered while an order still meets the cancellation conditions. The buyer selects a reason before confirming the cancellation.

### Inbox

The inbox contains conversations with farms and Refa3y support.

Order conversations help buyers ask about availability, preparation, substitutions, delivery, or quality concerns without leaving the application.

### Buyer profile

The buyer profile contains:

- Personal account information
- Saved delivery addresses
- Saved products
- Payment methods
- Notification preferences
- Help and support
- Sign out

## Vendor experience

The vendor workspace is completely separate from the buyer marketplace. It is organized around five main areas.

### Dashboard

The dashboard gives the vendor a concise view of farm activity.

It includes:

- Monthly revenue
- Revenue change
- Number of orders
- Return rate
- Orders requiring confirmation
- Appeals requiring a response
- Recent orders

The dashboard prioritizes items that require immediate attention.

### Products

The product area allows a vendor to review the farm’s inventory.

For every product, the vendor can see:

- Product name
- Price and selling unit
- Stock availability
- Current listing status

The vendor can also add or edit:

- Product photographs
- Product name
- Category
- Price
- Selling unit
- Available stock
- Harvest date
- Product description

### Vendor orders

Vendor orders are separated by operational stage:

- New
- Preparing
- Ready
- Out for delivery
- Completed

An order detail page includes:

- Buyer name
- Time the order was placed
- Delivery address
- Delivery window
- Products and quantities to prepare
- Individual prices
- Order total

The vendor can confirm an order, decline it with a reason, or update its preparation and delivery status. Buyers are expected to receive a notification whenever the status changes.

### Vendor inbox

The vendor inbox contains:

- Customer conversations
- Order questions
- Delivery discussions
- Messages from Refa3y support
- Appeal updates

### Farm profile

The farm area contains operational and account settings:

- Public farm information
- Verification documents
- Payout details
- Pickup locations
- Team access
- Returns and appeals
- Vendor support
- Sign out

## Vendor analytics

The analytics area helps vendors understand performance without overwhelming them with data.

It shows:

- Revenue for the selected period
- Change from the previous period
- Daily revenue trend
- Average order value
- Repeat-buyer percentage
- Best-selling products
- Revenue and order count by product

## Payouts

The payout area includes:

- The next expected payout
- Expected payout date
- Previous payouts
- Payout status
- Receiving bank account
- An option to update payout information

## Returns and appeals

Returns and appeals are managed separately from normal order messages.

An appeal includes:

- Appeal number
- Related order
- Reported issue
- Response deadline
- Buyer’s description
- Supporting photographs or documents
- Vendor response
- Resolution status

The vendor can respond with an explanation and supporting evidence. Resolved cases remain available for reference.

## Team access

A farm owner can invite staff and give them responsibilities appropriate to their role.

Examples include:

- Owner with full access
- Order manager
- Inventory manager

Team members should only see the information and actions needed for their work.

## Pickup locations

Vendors can manage the places where orders are prepared, collected, or handed to delivery drivers.

Each location includes a name, address, and default status.

## Notifications

Buyer notifications include:

- Order confirmation
- Preparation updates
- Delivery updates
- New farm messages
- Market announcements
- Relevant offers

Vendor notifications include:

- New orders
- Orders awaiting confirmation
- Customer messages
- Low stock
- Payout updates
- Return requests
- Appeal deadlines

## Support and safety

Buyers and vendors can contact Refa3y support through chat or phone.

Important payment and order conversations should remain inside Refa3y so the support team can review disputes when necessary.

The application should clearly explain:

- Why identity or farm documents are requested
- When an address is shared with a vendor
- When an order can be cancelled
- How refunds are handled
- How appeals are reviewed
- How payment information is protected

## Overall application map

```text
Refa3y
├── Account access
│   ├── Welcome
│   ├── Sign in
│   ├── Buyer registration
│   ├── Vendor registration
│   ├── Verification
│   └── Password recovery
│
├── Buyer experience
│   ├── Home
│   ├── Market
│   │   ├── Search and filters
│   │   ├── Product details
│   │   ├── Basket
│   │   └── Checkout
│   ├── Orders
│   │   ├── Active orders
│   │   ├── Order tracking
│   │   ├── Completed orders
│   │   └── Cancellation
│   ├── Inbox
│   └── Profile
│       ├── Addresses
│       ├── Saved products
│       ├── Payment methods
│       ├── Notifications
│       └── Support
│
└── Vendor experience
    ├── Dashboard
    ├── Products
    │   ├── Product list
    │   ├── Add product
    │   └── Edit product
    ├── Orders
    │   ├── New orders
    │   ├── Order details
    │   ├── Status updates
    │   └── Declined orders
    ├── Inbox
    ├── Analytics
    └── Farm account
        ├── Farm details
        ├── Documents
        ├── Payouts
        ├── Pickup locations
        ├── Team access
        ├── Returns and appeals
        └── Vendor support
```

## Current scope

The current version represents the complete visual experience and navigation structure. It demonstrates what users see and how they move through the product.

It does not yet process real accounts, payments, orders, messages, deliveries, payouts, or documents. Those services can be connected later without changing the overall product structure described above.
