# Dashboard Injectable Routes

This directory contains parallel routes that inject content into the dashboard layout without prop drilling or context providers.

## How It Works

`Injectables` are parallel routes like `@header` that are consumed by the main dashboard layout. Content rendered in these routes is passed to the corresponding layout components.

This pattern allows us to access props that are only available deeper in the route tree (like dynamic route parameters) and surface them to higher-level components (like the dashboard layout) without complex state management.

## @header Parallel Route

The `@header` route injects content into the dashboard header.

### Structure

- `[teamIdOrSlug]/sandboxes/page.tsx` - Renders the live sandbox counter in the header for the sandboxes page
- `[teamIdOrSlug]/[...slug]/page.tsx` - Catch-all route that renders nothing for other team pages
- `[teamIdOrSlug]/[...slug]/default.tsx` - Default component for catch-all routes

### Usage

To add header content for a specific route:

1. Create a new page component in the appropriate path
2. Export a component that returns the desired header content
3. The content will be automatically injected into the dashboard header, allowing you to surface route-specific data to the layout level
