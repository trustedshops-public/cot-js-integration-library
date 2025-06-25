"use client";

import { useState } from "react";
import CotSwitch from "./cot-switch";
import { AnonymousConsumerData } from "@trustedshops-public/cot-integration-library";

export default function Home() {
    const [authUser, setAuthUser] = useState<AnonymousConsumerData | null>(null);

    return (
        <main className="flex flex-col min-h-screen w-full mx-auto max-w-[1920px] p-8">
            <header className="flex flex-row items-center justify-between py-8 border-b border-gray-200 mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight">
                    My Store
                </h1>
                <CotSwitch
                    tsid="X832CCBC339C1B6586599463D3C2C5DF5"
                    onAuthenticationChange={setAuthUser}
                />
            </header>
            <section className="flex flex-col items-center justify-center flex-1">
                <div className="bg-white/90 rounded-2xl shadow-xl p-10 w-full max-w-xl border border-indigo-100">
                    <h2 className="text-2xl font-bold mb-6 text-indigo-800 flex items-center gap-2">
                        {authUser ? (
                            <>
                                <span className="inline-block w-3 h-3 bg-green-400 rounded-full animate-pulse" />{" "}
                                Authenticated User
                            </>
                        ) : (
                            <>
                                <span className="inline-block w-3 h-3 bg-gray-300 rounded-full" />{" "}
                                Welcome!
                            </>
                        )}
                    </h2>
                    <pre className="bg-indigo-50 rounded-lg p-6 text-base text-gray-800 overflow-x-auto border border-indigo-100 transition-colors duration-300 text-wrap">
                        {authUser
                            ? JSON.stringify(authUser, null, 2)
                            : "No user data available. Please log in using the Switch and refresh the page."}
                    </pre>
                </div>
            </section>
            <footer className="mt-16 text-center text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} My Store. All rights reserved.
            </footer>
        </main>
    );
}
