import PreviousEvents from './pages/PreviousEvents';
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
import AuthProvider from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerEventEditor from './pages/OrganizerEventEditor';
import EventDetails from "./pages/EventDetails";
import EventRegistrationPage from './pages/EventRegistrationPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';

export default function App() {
    return (
        <BrowserRouter><AuthProvider>
            <Navbar />

            <MotionShell><Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/past" element={<PreviousEvents />} />
                <Route path="/events/:id/register" element={<ProtectedRoute role="student"><EventRegistrationPage /></ProtectedRoute>} />
                <Route path="/events/:id" element={<EventDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
                <Route path="/organizer/events/new" element={<ProtectedRoute role="organizer"><OrganizerEventEditor /></ProtectedRoute>} />
                <Route path="/organizer/events/:id/edit" element={<ProtectedRoute role="organizer"><OrganizerEventEditor /></ProtectedRoute>} />
                <Route
                    path="/student/dashboard"
                    element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>}
                />
                <Route
                    path="/organizer/dashboard"
                    element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>}
                />
            </Routes></MotionShell>
        </AuthProvider></BrowserRouter>
    );
}
