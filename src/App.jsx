import { useState, useEffect } from "react";
import { supabase } from "./supabase";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Layout from "./components/Layout";

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  // 🔐 Handle auth + session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        checkEmailAndRole(sessionUser.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          checkEmailAndRole(sessionUser.id);
        } else {
          setRole(null);
          setEmailVerified(false);
          setLoading(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔍 Check email verification + role
  const checkEmailAndRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setEmailVerified(true);
        setRole(data.role || "user");
      } else {
        setEmailVerified(false);
        setRole("user");
      }
    } catch (err) {
      console.error("Error checking email/role:", err);
      setEmailVerified(false);
      setRole("user");
    } finally {
      setLoading(false);
    }
  };

  // 🧠 Decide what to render (NO early returns)
  let content;

  if (loading) {
    content = <div>Loading...</div>;
  } else if (user && !emailVerified) {
    content = <Dashboard user={user} emailVerified={false} />;
  } else if (user && emailVerified) {
    content =
      role === "admin" ? (
        <AdminDashboard user={user} />
      ) : (
        <Dashboard user={user} emailVerified={true} />
      );
  } else {
    content =
      page === "login" ? (
        <>
          <Login onLogin={setUser} />
          <button onClick={() => setPage("signup")}>Go to Signup</button>
        </>
      ) : (
        <>
          <Signup onSignup={setUser} />
          <button onClick={() => setPage("login")}>Go to Login</button>
        </>
      );
  }
  const isAuthPage = !user;

return (
  <Layout variant={isAuthPage ? "auth" : "app"}>
    {content}
  </Layout>
);


}

export default App;
