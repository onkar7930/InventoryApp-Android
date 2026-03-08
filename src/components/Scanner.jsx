import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Scanner({ onScanSuccess }) {
    const [scanResult, setScanResult] = useState(null);

    useEffect(() => {
        // Initialize the scanner
        const scanner = new Html5QrcodeScanner(
            "reader", // ID of the HTML element
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0] // 0 = rear camera only for mobile
            },
            false // Verbose logging off
        );

        // What happens when a code is found
        const handleScan = (decodedText) => {
            setScanResult(decodedText);
            scanner.clear(); // Stop scanning once we get a hit
            onScanSuccess(decodedText); // Pass the data up to query Supabase
        };

        const handleError = (error) => {
            // It throws errors constantly when it doesn't see a barcode, just ignore them
        };

        scanner.render(handleScan, handleError);

        // Cleanup when component unmounts
        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [onScanSuccess]);

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <h2>Scan Item</h2>
            {/* The scanner library will inject the video feed into this div */}
            <div id="reader"></div>

            {scanResult && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#e0ffe0' }}>
                    <p><strong>Detected Barcode:</strong> {scanResult}</p>
                </div>
            )}
        </div>
    );
}