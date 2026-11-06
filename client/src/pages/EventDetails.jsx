
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

export default function EventDetails() {
    const { id } = useParams();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchEvent() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/events/${id}`, {
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setEvent(response.data.data);
                }
            } catch (err) {
                if (
                    !controller.signal.aborted &&
                    err.code !== "ERR_CANCELED"
                ) {
                    setError(
                        err.response?.status === 404
                            ? "This event could not be found."
                            : "Unable to load event details."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchEvent();

        return () => controller.abort();
    }, [id]);

    if (loading) {
        return (
            <main className="mx-auto max-w-6xl px-6 py-20">
                <p>Loading event details...</p>
            </main>
        );
    }

    if (error || !event) {
        return (
            <main className="mx-auto max-w-6xl px-6 py-20">
                <h1 className="text-2xl font-bold">
                    {error || "Event unavailable"}
                </h1>

                <Link
                    to="/events"
                    className="mt-5 inline-block underline"
                >
                    Back to events
                </Link>
            </main>
        );
    }

    const remaining = Math.max(
        0,
        event.capacity - event.registeredCount
    );

    return (
        <main className="min-h-screen bg-[#F7F6F2] px-6 py-12 text-[#202A29]">
            <div className="mx-auto max-w-6xl">
                <Link
                    to="/events"
                    className="text-sm font-semibold text-[#607D55]"
                >
                    ← Back to events
                </Link>

                <div className="mt-10">
                    <span className="rounded-full bg-[#E2EBCF] px-4 py-2 text-xs font-semibold">
                        {event.category || "Other"}
                    </span>

                    <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl">
                        {event.title}
                    </h1>

                    <p className="mt-5 text-[#718075]">
                        Organized by {event.organizer?.name || "Event organizer"}
                    </p>
                </div>

                <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
                    <section>
                        <div className="flex h-64 items-center justify-center rounded-2xl bg-[#E6EDE0] md:h-80">
                            <span className="text-7xl font-black text-[#A7BE9E]">
                                EN.
                            </span>
                        </div>

                        <h2 className="mt-10 text-2xl font-bold">
                            About this event
                        </h2>

                        <p className="mt-4 whitespace-pre-line leading-8 text-[#637266]">
                            {event.description}
                        </p>
                    </section>

                    <aside className="h-fit rounded-2xl border border-[#E0E5DA] bg-white p-7">
                        <h2 className="text-lg font-bold">
                            Event information
                        </h2>

                        <div className="mt-6 space-y-5 text-sm">
                            <div>
                                <p className="text-[#8A978C]">Date & time</p>
                                <p className="mt-1 font-semibold">
                                    {new Date(event.date).toLocaleString(
                                        "en-US",
                                        {
                                            dateStyle: "full",
                                            timeStyle: "short",
                                        }
                                    )}
                                </p>
                            </div>

                            <div>
                                <p className="text-[#8A978C]">Location</p>
                                <p className="mt-1 font-semibold">
                                    {event.location}
                                </p>
                            </div>

                            <div>
                                <p className="text-[#8A978C]">Availability</p>
                                <p className="mt-1 font-semibold">
                                    {remaining} of {event.capacity} seats available
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled
                            className="mt-8 w-full cursor-not-allowed rounded-xl bg-[#202A29] px-6 py-4 text-sm font-semibold text-white opacity-60"
                        >
                            {remaining === 0
                                ? "Event fully booked"
                                : "Registration coming next"}
                        </button>
                    </aside>
                </div>
            </div>
        </main>
    );
}
