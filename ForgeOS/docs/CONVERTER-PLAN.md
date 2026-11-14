# Converter: capability registry, PDF workspace and delivery plan

Status: proposed separate product. Do not add a nonfunctional 'convert anything' selector. Preserve original inputs; each job records exact input/output formats, engine/version, settings, limits, fidelity and artifacts.

## Capability families

1. Image to PDF: JPEG/PNG/WebP initially, explicit page size/orientation/margins/order; TIFF/HEIC require separate reviewed decoders. PDF to images: page-range rasterization to PNG/JPEG with DPI/background/quality and a ZIP only when multiple outputs exist.
2. Office/OpenDocument to PDF: DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS/ODP and RTF through a pinned LibreOffice worker with macros and network disabled, fonts declared and fidelity fixtures. iWork Pages/Numbers/Keynote needs a format/version decision and licensed tooling; not assumed supported by extension name.
3. Text/CSV/HTML/EPUB to PDF: encoding, layout, paper size, tables and fonts must be explicit. HTML uses a restricted renderer with no default outbound access, not unrestricted URL browsing. EPUB requires rights/DRM-aware supported inputs; do not bypass DRM. CSV is tabular rendering, not a renamed PDF.
4. PDF to Word/Excel/PowerPoint: extraction/reconstruction is lossy and layout-dependent. Native-text PDFs, scans, complex tables, charts and forms have different paths. OCR has language and confidence settings. Offer preview/quality warnings and searchable PDF/text as alternatives; never label the reverse of Office export lossless.
5. PDF normalization/compression: explicit target compatibility or PDF/A validation profile, lossless structural optimization versus lossy image recompression, before/after bytes and page-render checks. Compression may not reduce size. 'PDF to PDF' must name a normalization/profile goal.
6. Organization: merge, split ranges, reorder, rotate, delete/extract/copy pages, page numbering and watermark/barcode placement, with thumbnails and an undoable operation plan before export. Deleting pages changes a new output; do not destroy the original.
7. Reader/editing: text search, annotation/highlights, page labels, drawing and bounded content edits; distinguish overlay annotation from true text/layout editing. Redaction must remove content and hidden metadata, not cover it with a rectangle. Validate extraction after redaction.
8. Forms/signing: inspect/fill supported AcroForms, flatten with a preview and explicit result. A drawn signature is not a cryptographic digital signature. Certificate signing, validation and timestamping require separate key management and licensed/certified integration where appropriate.
9. Protection/unlock: encrypt new output with user-selected password/permissions and verified tooling. Remove protection only with supplied credentials and authorization; no password cracking or DRM bypass. Changing a signed PDF can invalidate signatures; explain that before export.
10. Sharing/sending/tracking: private expiring artifact links, access/revocation audit and explicit recipient action. A local conversion does not send documents. Download/access logs are not proof a recipient read a document; do not promise tracking after offline download.
11. AI PDF: source/page-linked summary, question answering and translation with quoted evidence, explicit model request preview and privacy/budget controls. Videos can contribute reviewed transcripts/keyframes later; no invented 'video to PDF' meaning. AI coding/generator is a separate app-development function in StackForge, not an ambiguous PDF conversion operation.
12. Scanner: camera/upload capture, crop/deskew/orientation, multipage review and optional OCR; camera permission is user-controlled. Mobile/native capture and browser processing require separate measured support.

## Ambiguous requested labels

SWP is usually an editor swap file and is not assumed to be an exportable document. CSF is unresolved and must not silently become CSV. 'I work' is tentatively iWork, requiring confirmation. ZIP to PDF means inspect and select supported contained documents under archive limits, then convert/merge in a reviewed order; it does not render arbitrary executables into PDF. 'Track PDF', 'format PDF', 'PDF form filter', 'video first' and 'AI generator' need specific outcomes before implementation.

## Architecture

Authenticated workspace API -> capability/spec validation -> durable job queue -> per-format isolated worker -> malware/structure checks -> preview and fidelity validation -> private artifacts/expiry -> explicit download/share action. A worker has no platform/database/host credentials, no default network, non-root identity, read-only base image, isolated temporary storage and hard CPU/RAM/time/page/pixel/expanded-byte limits. Rendering untrusted PDFs or Office documents in the main API process is forbidden.

Candidate engines, subject to licensing/security/fidelity verification: LibreOffice for Office export, qpdf for supported structural/protection operations, PDF.js for browser preview, a reviewed PDF editing library for page/annotation operations, Tesseract/OCRmyPDF for OCR, and a restricted browser renderer for HTML. PDF rendering and reconstruction engines need an explicit license decision (including any AGPL/commercial obligations). No dependency name alone proves a requested feature is implemented.

Primary references: https://help.libreoffice.org/latest/en-US/text/shared/guide/convertfilters.html and https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html . Verify engine-specific documentation and licenses again when implementation begins.

## Workbench

Left: input manifest/pages and operation history. Center: selected source/result page at synchronized zoom. Right: compatible outputs, settings, fidelity/size warnings and job status. Bottom: evidence and download/share action. The available output selector comes from a tested capability registry. Unsupported edges explain why. Browser progress is based on measured pages/bytes, and canceling prevents a result from being published as complete.

## Delivery and acceptance

C1: images/text to PDF, PDF rasterization and bounded page organization, using fixture outputs and real render QA. C2: Office/OpenDocument exports in isolated workers with fixed fonts and macros disabled. C3: compression/OCR/searchable PDF and metadata cleanup. C4: reconstruction/editing/forms/redaction with engine-specific fidelity gates. C5: explicit sharing/digital signatures and grounded AI tasks.

Initial limits to validate: 25MiB upload, 200 pages, 16MP decoded image, 120s job deadline and archive limits inherited from Comparer. Limits are configurable by deployment only within tested bounds. Fixtures include malformed/encrypted/signed/macro documents, decompression bombs, CJK/RTL/fonts, huge images, tables/merged cells, accessibility tags, forms and canceled jobs. Compare page count, rendered layout, extracted text, links, metadata, form values, signatures and bytes according to the capability. A successful process exit is not sufficient fidelity evidence.
