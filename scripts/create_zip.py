import os
import zipfile

def create_project_zip():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    public_dir = os.path.join(root_dir, 'public')
    os.makedirs(public_dir, exist_ok=True)
    
    zip_path = os.path.join(public_dir, 'nocturne-app.zip')
    root_zip_path = os.path.join(root_dir, 'nocturne-app.zip')
    
    # Exclude heavy and generated directories
    excluded_dirs = {
        'node_modules',
        '.git',
        'dist',
        '.cache',
        '.aistudio',
        '__pycache__'
    }
    
    excluded_files = {
        'nocturne-app.zip',
        '.DS_Store'
    }

    print(f"Creating zip archive at: {zip_path}")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for foldername, subfolders, filenames in os.walk(root_dir):
            # Prune excluded directories in-place
            subfolders[:] = [d for d in subfolders if d not in excluded_dirs]
            
            # Skip if current folder is inside an excluded directory or is public/itself for the zip
            rel_folder = os.path.relpath(foldername, root_dir)
            if any(part in excluded_dirs for part in rel_folder.split(os.sep)):
                continue
                
            for filename in filenames:
                if filename in excluded_files:
                    continue
                file_path = os.path.join(foldername, filename)
                rel_file = os.path.relpath(file_path, root_dir)
                zipf.write(file_path, arcname=rel_file)
                
    # Also copy or create link to root
    if os.path.exists(zip_path):
        import shutil
        shutil.copyfile(zip_path, root_zip_path)
        size_mb = os.path.getsize(zip_path) / (1024 * 1024)
        print(f"Zip created successfully! Size: {size_mb:.2f} MB")

if __name__ == '__main__':
    create_project_zip()
