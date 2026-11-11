import os

admin_dir = r"D:\claude\backend_store_raiwa\backend\api\admin"
files = ["blog.ts", "cms-pages.ts", "collections.ts", "faqs.ts",
         "phone-app.ts", "redirects.ts", "reviews.ts", "suppliers.ts"]

for filename in files:
    filepath = os.path.join(admin_dir, filename)
    with open(filepath, "r") as f:
        content = f.read()
    
    # Check if the pattern exists
    if "const { error } = await supabase\n      .from('" in content:
        # Fix: change const { error } to const { data, error }
        # and add .single() after .select()
        content = content.replace(
            "const { error } = await supabase\n      .from('",
            "const { data, error } = await supabase\n      .from('"
        )
        # Add .single() after .select()
        content = content.replace(".select();", ".select().single();")
        
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Fixed {filename}")

print("Done fixing files")