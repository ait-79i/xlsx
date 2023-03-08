import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import MainPage from "./Components/MainPage";
import Login from "./Components/Login/Login";
import "./App.css";
import RequireAuth from "./Components/RequireAuth";

function App() {
	const useAuth = () => {
		const token = localStorage.getItem("token");
		if (!token || token === undefined) {
			return false;
		} else {
			return true;
		}
	};

	const logged = useAuth();
	return (
		<Router>
			<Routes>
				{/* <Route path="/" element={<Layout />}> */}
				{/* Public routes */}
				<Route
					path="/login"
					element={logged === false ? <Login /> : <Navigate to="/" />}
				/>
				{/* Protected routes */}
				<Route element={<RequireAuth />}>
					<Route path="/" element={<MainPage />} />
					<Route path="/mine" element={<h1>mine</h1>} />
				</Route>
				{/* Catsh all  */}
				<Route path="*" element={<h1> Not Found</h1>} />
			</Routes>
		</Router>
	);
}

export default App;
