# Uploads Directory

This directory stores files uploaded by users for expenses.

## Structure

- `expenses/` - Contains receipt files, invoices, and other documents attached to expenses

## File Naming Convention

Files are stored with unique names to prevent conflicts:
- Format: `{timestamp}-{random}-{originalname}`
- Example: `1732819200000-123456789-receipt.pdf`

## File Management

- Files are automatically stored when expenses are created with attachments
- Files are automatically deleted when their associated expense is deleted
- Maximum file size: 5MB
- Allowed types: Images (jpg, jpeg, png, gif), PDFs, Office documents (doc, docx, xls, xlsx), text files

## Security

- All file access requires authentication
- Files are served through controlled routes, not direct access
- File types are validated on upload
- File size limits are enforced

## Maintenance

This directory may grow over time. Consider periodic cleanup of orphaned files if needed.

## Backup

Include this directory in your backup strategy to preserve expense attachments.
