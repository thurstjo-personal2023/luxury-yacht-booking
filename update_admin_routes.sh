#!/bin/bash

# This script updates all instances of verifyAdminAuth to verifyAdminRole('admin')
# in the server/admin-routes.ts file

# Make a backup of the original file
cp server/admin-routes.ts server/admin-routes.ts.bak

# Replace all instances of verifyAdminAuth with verifyAdminRole('admin')
sed -i 's/app\.get\(.*\)verifyAdminAuth/app.get\1verifyAdminRole('\''admin'\'')/' server/admin-routes.ts
sed -i 's/app\.post\(.*\)verifyAdminAuth/app.post\1verifyAdminRole('\''admin'\'')/' server/admin-routes.ts

echo "Replaced all instances of verifyAdminAuth with verifyAdminRole('admin')"

# Show what changed
echo "Changes made:"
diff server/admin-routes.ts.bak server/admin-routes.ts
