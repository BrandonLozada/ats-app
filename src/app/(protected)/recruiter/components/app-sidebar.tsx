"use client";

import * as React from "react";
import {
  IconFrame,
  IconChartPie,
  IconMap,
  IconBriefcase,
  IconHospital,
  IconStethoscope,
  IconBuildingHospital,
} from "@tabler/icons-react";

import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Ama Hospital - Anáhuac",
      logo: <IconBuildingHospital />,
      plan: "Enterprise",
    },
    {
      name: "Ama Hospital - Consultorios Norte",
      logo: <IconStethoscope />,
      plan: "Startup",
    },
    {
      name: "Ama Servicios Médicos - Apodaca",
      logo: <IconHospital />,
      plan: "Free",
    },
  ],
  // Revisar porque navmain tiene una URL por fuera de items
  // Además revisar porque no muestra la página activa de la ruta
  navMain: [
    {
      title: "Módulos",
      url: "/recruiter",
      icon: <IconBriefcase />,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/recruiter",
        },
        {
          title: "Candidatos",
          url: "/recruiter/candidates",
        },
        {
          title: "Kanban",
          url: "/recruiter/kanban",
        },
        {
          title: "Agenda",
          url: "/recruiter/planner?view=agenda",
        },
        {
          title: "Calendario",
          url: "/recruiter/planner?view=calendar",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: <IconFrame />,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: <IconChartPie />,
    },
    {
      name: "Travel",
      url: "#",
      icon: <IconMap />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
