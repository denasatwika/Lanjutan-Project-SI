"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/state/auth";
import { ArrowLeft, Mail, LoaderCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api/documents";

interface Notification {
    id: number;
    status: string;
    title: string;
    documentId?: string;
    createdAt: string;  
    isRead: boolean;
    timestamp?: string;
}

function formatTimeAgo(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return "Baru saja";
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
        return "Baru saja";
    }

    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 0) return "Baru saja";

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun yang lalu";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan yang lalu";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari yang lalu";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam yang lalu";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " menit yang lalu";
    
    return Math.floor(seconds) + " detik yang lalu";
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;

        const fetchNotifications = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(API_ENDPOINTS.GET_NOTIFICATIONS, {
                    method: "GET",
                    credentials: "include",
                });

                if (response.ok) {
                    const result = await response.json();
                    setNotifications(result.data || []);
                }

            } catch (err: any) {
                console.error("Gagal memuat riwayat notifikasi", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        const socket = new WebSocket('ws://localhost:8787');

        socket.onopen = () => {
            socket.send(JSON.stringify({
                type: "AUTHENTICATE",
                userId: user.id
            }));
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log("[WS Client] Received data:", message);
                if (message.type === "NEW_DOCUMENT_ASSIGNED") {
                    const newNotif = message.payload;
                    
                    setNotifications(prev => [newNotif, ...prev]);
                    
                    if (Notification.permission === "granted") {
                        new Notification(newNotif.line1, { body: newNotif.line2 });
                    }
                }
            } catch (error) {
                console.error("Gagal memproses pesan WebSocket", error);
            }
        };

        return () => socket.close();
    }, [user?.id]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center p-20">
                    <LoaderCircle className="animate-spin h-8 w-8 text-gray-500" />
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-red-500">{error}</p>;
        }

        if (notifications.length === 0) {
            return (
                <p className="text-center text-gray-500">Tidak ada notifikasi baru.</p>
            );
        }

        return (
            <ul className="space-y-4">
                {notifications.map((notif) => (
                    <li
                        key={notif.id}
                        className="pb-4 border-b border-gray-200 last:border-b-0"
                    >
                        <Link
                            href={`/chief/sign-document/${notif.id}`}
                            className="block hover:bg-gray-50 p-2 -m-2 rounded-lg"
                        >
                            <div className="flex items-start gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-600 border-2 border-white"></span>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-600">{notif.status}</p>
                                    <p className="font-semibold text-gray-800">{notif.title}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatTimeAgo(notif.createdAt || notif.timestamp)}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="bg-white min-h-screen">
            <header className="bg-white shadow-sm text-gray-800 p-4 flex items-center sticky top-0 z-10">
                <Link href="/approver/dokumen" className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-xl font-semibold text-center flex-grow">
                    Notifikasi
                </h1>
                <div className="w-10"></div> {/* Spacer to balance the back button */}
            </header>

            <main className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Notifikasi Terbaru
                </h2>
                {renderContent()}
            </main>
        </div>
    );
}
