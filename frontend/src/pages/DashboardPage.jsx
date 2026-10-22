// DashboardPage — the main screen after login.
// Will show tickets based on the logged-in user's role (User / Agent / Admin).
// Calls ticketService.getAll() when implemented.

function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Ticket list will appear here after login.</p>
    </main>
  );
}

export default DashboardPage;
