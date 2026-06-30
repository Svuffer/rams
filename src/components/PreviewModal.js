// [SEC 100] Imports & state init
// SEC 100  Imports & state init        React, react-to-print, PrintableDocument, axios
// SEC 200  PDF generation & printing   inlineImages · handlePrint · handleGeneratePdf
// SEC 300  JSX render                  modal overlay · sticky header · print-only container · export
import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import PrintableDocument from './PrintableDocument';
import axios from 'axios'; // For PDFShift API calls

const PreviewModal = ({ isOpen, onClose, data, allTasks }) => {
    const printableRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
// [SEC 100 END]

// [SEC 200] PDF generation & printing
    // Function to inline images as base64
    const inlineImages = async (container) => {
        const imgs = Array.from(container.querySelectorAll('img'));
        await Promise.all(imgs.map(async img => {
            const src = img.getAttribute('src');
            if (!src || src.startsWith('data:')) return;
            const isLocal = src.startsWith('http://localhost') || src.startsWith('https://localhost');
            const isStatic = src.startsWith('/static/');
            if (!(isLocal || isStatic)) return;
            try {
                const absolute = isStatic ? `${window.location.origin}${src}` : src;
                const r = await fetch(absolute);
                if (!r.ok) return;
                const blob = await r.blob();
                const reader = new FileReader();
                const dataUri = await new Promise(res => {
                    reader.onload = () => res(reader.result);
                    reader.readAsDataURL(blob);
                });
                img.setAttribute('src', dataUri);
            } catch (e) {
                console.warn('Image inline failed', src, e);
            }
        }));
    };

    // Existing print functionality (untouched)
    const handlePrint = useReactToPrint({
        content: () => printableRef.current,
        contentRef: printableRef,
        documentTitle: `RAMS-${data?.client || 'document'}-${new Date().toISOString().slice(0, 10)}`,
        pageStyle: `
          @page { size: A4; margin:15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `,
        copyStyles: true
    });

    // PDFShift function (untouched)
    const handleGeneratePdf = async () => {
        if (!printableRef.current) {
            alert('No content to convert.');
            return;
        }

        const apiKey = process.env.REACT_APP_PDFSHIFT_KEY;
        console.log('PDFShift Key:', apiKey);
        if (!apiKey) {
            alert('Missing REACT_APP_PDFSHIFT_KEY in .env');
            return;
        }

        setIsGenerating(true);
        try {
            const clone = printableRef.current.cloneNode(true);
            document.body.appendChild(clone);
            await inlineImages(clone);
            const processedHtml = clone.innerHTML;
            document.body.removeChild(clone);

            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>RAMS PDF</title></head><body>${processedHtml}</body></html>`;
            console.log('HTML length:', fullHtml.length);

            const response = await axios.post(
                'https://api.pdfshift.io/v3/convert/pdf',
                {
                    source: fullHtml,
                    format: 'A4',
                    margin: '15mm',
                },
                {
                    headers: {
                        'X-API-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RAMS-${data?.client || 'document'}-${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDFShift error:', error);
            if (error.response) {
                console.error('Response status:', error.response.status);
                const text = await error.response.data.text();
                console.error('Response data:', text);
            }
            alert('PDF generation failed. Check console for details.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;
// [SEC 200 END]

// [SEC 300] JSX render
    return (
        <>
            <div className="preview-modal-overlay no-print" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflowY: 'auto',
            }}>
                <header style={{
                    width: '100%',
                    padding: '1rem 2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1001,
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--uctel-blue, #2c4f6b)', margin: 0 }}>
                        RAMS Document Preview
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handlePrint}
                            style={{
                                backgroundColor: 'var(--uctel-teal, #0d6efd)',
                                color: '#ffffff',
                                fontWeight: 600,
                                padding: '0.6rem 1.25rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(0,0,0,0.15)',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                letterSpacing: '.3px'
                            }}
                        >
                            Print To PDF
                        </button>
                        <button
                            onClick={handleGeneratePdf}
                            disabled={isGenerating}
                            style={{
                                backgroundColor: isGenerating ? '#ccc' : '#28a745',
                                color: '#ffffff',
                                fontWeight: 600,
                                padding: '0.6rem 1.25rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(0,0,0,0.15)',
                                cursor: isGenerating ? 'not-allowed' : 'pointer',
                                fontSize: '0.95rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                letterSpacing: '.3px'
                            }}
                        >
                            {isGenerating ? 'Generating...' : 'Generate PDF'}
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#e2e8f0',
                                color: '#334155',
                                fontWeight: 600,
                                padding: '0.6rem 1.25rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(0,0,0,0.12)',
                                cursor: 'pointer',
                                fontSize: '0.95rem'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </header>

                <div style={{ width: '210mm', margin: '2rem 0', backgroundColor: 'white' }}>
                    <PrintableDocument data={data} allTasks={allTasks} />
                </div>
            </div>

            <div className="print-only" style={{ display: 'none' }}>
                <div ref={printableRef}>
                    <PrintableDocument data={data} allTasks={allTasks} />
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin-top: 1cm; }
                    .no-print, .main-content { display: none !important; }
                    .print-only { display: block !important; }
                }
            `}</style>
        </>
    );
};

export default PreviewModal;
// [SEC 300 END]