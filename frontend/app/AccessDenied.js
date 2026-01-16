"use client";

export default function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white text-center p-4">
            <h1 className="text-4xl font-bold text-red-500 mb-4">
                Access Denied
            </h1>
            <p className="text-lg mb-2">
                You do not have permission to view this page.
            </p>
            <p className="text-md text-gray-400">
                A valid API key is required. Please append it to the URL as a
                query parameter.
            </p>
            <p className="mt-4 p-2 bg-gray-800 rounded font-mono text-sm">
                Example:{" "}
                <span className="text-yellow-400">
                    https://gangway.reutlingen.university/?apiKey=your-secret-api-key
                </span>
            </p>
        </div>
    );
}
