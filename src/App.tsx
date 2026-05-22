import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Record from './pages/Record';
import History from './pages/History';
import Stats from './pages/Stats';
import Tags from './pages/Tags';
import Goals from './pages/Goals';
import Plan from './pages/Plan';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/record" element={<Record />} />
        <Route path="/record/:id" element={<Record />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
