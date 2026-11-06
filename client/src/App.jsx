import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import MotionShell from "./components/MotionShell";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import EventDetails from "./pages/EventDetails";

export default function App() {
    return (
        <BrowserRouter>
            <Navbar />

            <MotionShell><Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/student/dashboard"
                    element={<StudentDashboard />}
                />
                <Route
                    path="/organizer/dashboard"
                    element={<OrganizerDashboard />}
                />
            </Routes></MotionShell>
        </BrowserRouter>
    );
}
