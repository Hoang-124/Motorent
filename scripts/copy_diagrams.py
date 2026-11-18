import shutil, os

os.makedirs('docs/diagrams', exist_ok=True)

mapping = {
    'docs/extracted_diagrams/sds_image2.png': 'docs/diagrams/package_diagram.png',
    'docs/extracted_diagrams/rds_image7.jpeg': 'docs/diagrams/usecase_overview_flow.jpeg',
    'docs/extracted_diagrams/rds_image3.png': 'docs/diagrams/usecase_customer.png',
    'docs/extracted_diagrams/rds_image4.png': 'docs/diagrams/usecase_staff.png',
    'docs/extracted_diagrams/rds_image5.png': 'docs/diagrams/usecase_manager.png',
    'docs/extracted_diagrams/rds_image6.png': 'docs/diagrams/usecase_admin.png',
    'docs/extracted_diagrams/sds_image5.jpeg': 'docs/diagrams/database_booking_erd.jpeg',
    'docs/extracted_diagrams/sds_image8.jpeg': 'docs/diagrams/database_support_erd.jpeg',
    'docs/extracted_diagrams/sds_image6.jpeg': 'docs/diagrams/database_fleet_erd.jpeg',
}

for src, dst in mapping.items():
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {src} -> {dst}")
    else:
        print(f"Not found: {src}")
