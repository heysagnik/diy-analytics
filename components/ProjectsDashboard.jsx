// ProjectsDashboard.jsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  Avatar,
  Modal,
  TextField,
  Switch,
  useTheme,
  createTheme,
  ThemeProvider,
  Stack,
} from '@mui/material';
import { Add, TrendingUp, TrendingDown, InsertChart } from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const dummyProjects = [
  {
    id: 1,
    name: "Personal Blog",
    status: "Growing",
    visitors: 2400,
    growth: 12,
  },
  {
    id: 2,
    name: "Ecommerce",
    status: "Declining",
    visitors: 1200,
    growth: -8,
  },
];

const statusColor = {
  Growing: '#4caf50',
  Declining: '#f44336',
};

const samplePieData = [
  { name: 'Desktop', value: 60 },
  { name: 'Mobile', value: 30 },
  { name: 'Tablet', value: 10 },
];

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function ProjectCard({ project }) {
  return (
    <Card sx={{ mb: 2, boxShadow: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Avatar sx={{ bgcolor: statusColor[project.status] }}>
            {project.status === 'Growing' ? <TrendingUp /> : <TrendingDown />}
          </Avatar>
          <Box sx={{ ml: 2, flexGrow: 1 }}>
            <Typography variant="h6">{project.name}</Typography>
            <Typography fontSize={14} color="text.secondary">
              Visitors: {project.visitors} &nbsp;|&nbsp; Growth: {project.growth}%
            </Typography>
            <Chip
              size="small"
              label={project.status}
              sx={{ mt: 1, bgcolor: statusColor[project.status], color: '#fff' }}
            />
          </Box>
          <ResponsiveContainer width={80} height={60}>
            <PieChart>
              <Pie
                data={samplePieData}
                dataKey="value"
                innerRadius={16}
                outerRadius={28}
                fill="#8884d8"
                paddingAngle={2}
              >
                {samplePieData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={['#8884d8', '#82ca9d', '#ffc658'][idx % 3]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState(dummyProjects);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [themeDark, setThemeDark] = useState(false);

  const theme = useTheme();

  const filteredProjects = projects.filter(
    p =>
      (filter === 'All' || p.status === filter) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddProject = () => {
    setProjects([
      ...projects,
      {
        id: projects.length + 1,
        name: newName,
        status: Math.random() > 0.5 ? 'Growing' : 'Declining',
        visitors: Math.floor(Math.random() * 2000 + 500),
        growth: Math.floor(Math.random() * 20 - 10),
      },
    ]);
    setModalOpen(false);
    setNewName('');
  };

  return (
    <ThemeProvider theme={themeDark ? darkTheme : theme}>
      <Box sx={{ p: 4, minHeight: '100vh', bgcolor: themeDark ? '#181818' : '#f3f5ff' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4" fontWeight={600}>Projects</Typography>
          <Switch checked={themeDark} onChange={() => setThemeDark(!themeDark)} />
          <Typography fontSize={14}>{themeDark ? 'Dark' : 'Light'} Mode</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" mt={2} spacing={1}>
          {['All', 'Growing', 'Declining'].map(lbl => (
            <Chip
              key={lbl}
              label={lbl}
              color={filter === lbl ? 'primary' : 'default'}
              onClick={() => setFilter(lbl)}
            />
          ))}
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ ml: 2, width: 200, bgcolor: '#fff' }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setModalOpen(true)}
            sx={{ ml: 'auto' }}
          >
            New Project
          </Button>
        </Stack>
        <Box mt={4}>
          {filteredProjects.length ? (
            filteredProjects.map(proj => <ProjectCard key={proj.id} project={proj} />)
          ) : (
            <Box textAlign="center" py={8}>
              <InsertChart sx={{ fontSize: 56, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                No projects found
              </Typography>
              <Typography mt={0.5}>
                Create your first project to get started with analytics.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                sx={{ mt: 2 }}
                onClick={() => setModalOpen(true)}
              >
                Create New Project
              </Button>
            </Box>
          )}
        </Box>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <Box
            sx={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300, bgcolor: 'background.paper', p: 3, borderRadius: 2,
            }}
          >
            <Typography variant="h6" mb={2}>Add New Project</Typography>
            <TextField
              label="Project Name"
              variant="outlined"
              fullWidth
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              disabled={!newName}
              onClick={handleAddProject}
            >
              Add Project
            </Button>
          </Box>
        </Modal>
      </Box>
    </ThemeProvider>
  );
}
