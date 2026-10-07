# AIVA Inventory

Upgrade my existing AI Inventory Management System into a complete, professional and modern inventory management web application.



IMPORTANT:

Do not remove or break any existing features, pages, authentication, Supabase connection, or existing functionality. Improve the current project and keep the existing design consistent.



PROJECT REQUIREMENTS:



1. DASHBOARD

- Create a modern professional dashboard.

- Show total products.

- Total inventory quantity.

- Total inventory value in Indian Rupees (₹).

- Low stock products.

- Out of stock products.

- Today's sales.

- Monthly sales.

- Recent transactions.

- Recent added products.

- Use attractive summary cards with icons.



2. GRAPHICAL REPRESENTATIONS

Add interactive charts and graphs:

- Monthly sales chart.

- Inventory value chart.

- Stock quantity by category.

- Low-stock products chart.

- Sales vs purchases comparison.

- Category-wise inventory distribution.

Use responsive charts that work properly on desktop and mobile.



3. PRODUCT MANAGEMENT

- Add Product.

- Edit Product.

- Delete Product.

- Product name.

- SKU/Product ID.

- Category.

- Supplier.

- Quantity.

- Minimum stock level.

- Purchase price in ₹.

- Selling price in ₹.

- Automatically calculate total product value in ₹.

- Product image upload if possible.

- Search and filter products.

- Sort products by name, price, quantity and stock status.



4. INVENTORY

Create a professional inventory table showing:

- Product

- SKU

- Category

- Quantity

- Purchase Price (₹)

- Selling Price (₹)

- Total Value (₹)

- Stock Status

- Actions



Use Indian Rupee formatting everywhere, for example:

₹500

₹1,250

₹25,000



5. LOW STOCK ALERTS

- Automatically detect products below minimum stock level.

- Show low-stock warning.

- Show out-of-stock warning.

- Display notifications on the dashboard.

- Add visual warning indicators.



6. AI SUGGESTIONS

Create an AI Suggestions page that analyzes inventory data and provides useful suggestions such as:

- Which products need restocking.

- Which products have low stock.

- Which products are selling faster.

- Which products are not moving.

- Suggested reorder quantity.

- Inventory optimization suggestions.

- Sales trend insights.

- Simple explanations suitable for a shop owner.



7. AI VOICE ASSISTANT

Add an AI Voice Assistant feature to the application.



The voice assistant should allow the user to ask questions such as:

- "Show low stock products."

- "How many products are available?"

- "What is my total inventory value?"

- "Show today's sales."

- "Which products need restocking?"

- "Show products in the electronics category."



Use browser speech recognition / speech synthesis where supported.

Provide a microphone button with a clear listening indicator.

The assistant should respond in simple language and read important results aloud.

If a feature cannot be implemented without an external AI API, create the UI and structure it so an API can be connected later.



8. SALES MANAGEMENT

Add sales functionality:

- Record sales.

- Product selection.

- Quantity sold.

- Selling price in ₹.

- Automatically calculate total amount.

- Update inventory quantity after sale.

- Sales history.

- Daily, weekly and monthly sales.



9. REPORTS

Create a Reports page with:

- Sales report.

- Inventory report.

- Low stock report.

- Product performance report.

- Category report.

- Total inventory value in ₹.

- Date filters.

- Export report to CSV/PDF if possible.



10. SEARCH

Add a global search feature.

Users should be able to search products, SKU, categories and suppliers quickly.



11. NOTIFICATIONS

Add a notification system for:

- Low stock.

- Out of stock.

- New product added.

- Sales completed.

- Important inventory updates.



12. SETTINGS

Create settings for:

- Shop/business name.

- Currency: Indian Rupee (₹).

- Low-stock threshold.

- User profile.

- Theme settings.

- Notification preferences.



13. UI/UX

Use a professional modern dashboard design.

Use a clean blue/white theme.

Make the application responsive for laptop, tablet and mobile.

Use modern cards, icons, tables, badges, charts and animations.

Keep navigation simple:

Dashboard

Products

Inventory

Sales

Low Stock Alerts

AI Suggestions

AI Voice Assistant

Reports

Settings

Logout



14. DATABASE / SUPABASE

Use the existing Supabase connection.

Store products, inventory, sales and user-related data in Supabase.

Do not create fake data when real Supabase data is available.

Make sure CRUD operations work correctly.

Make sure authentication and user-specific data continue working.



15. IMPORTANT VALIDATION

- Prevent negative stock.

- Validate required fields.

- Validate prices and quantities.

- Show proper success/error messages.

- Handle loading states.

- Handle empty states.

- Handle database errors gracefully.



16. PROFESSIONAL TOUCH

Add a dashboard section called "AI Inventory Insights".

Show useful automatic insights based on actual inventory and sales data.

Use ₹ everywhere for money values.

Make the entire project look like a real-world AI-powered Inventory Management System suitable for a college project demonstration.



Before making changes, inspect the existing project structure and reuse existing components wherever possible. Do not unnecessarily rewrite working code.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b1102c8a-bfb2-441a-ac8f-e6d7ff45c56e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
