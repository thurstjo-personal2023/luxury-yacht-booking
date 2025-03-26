#!/bin/bash

# This script reverts the changes and applies the correct middleware pattern
# in the server/admin-routes.ts file

# Restore from backup
cp server/admin-routes.ts.bak server/admin-routes.ts

# Change the import to include verifyAdminRole
sed -i 's/import { verifyAuth, adminDb } from/import { verifyAuth, adminDb, verifyAdminRole } from/' server/admin-routes.ts

# Replace all instances of verifyAdminAuth with verifyAdminRole (no parameters)
sed -i 's/app\.get\(.*\)verifyAdminAuth/app.get\1verifyAdminRole/' server/admin-routes.ts
sed -i 's/app\.post\(.*\)verifyAdminAuth/app.post\1verifyAdminRole/' server/admin-routes.ts

echo "Replaced all instances of verifyAdminAuth with verifyAdminRole"

# Show what changed
echo "Changes made:"
diff server/admin-routes.ts.bak server/admin-routes.ts
