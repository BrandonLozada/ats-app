"use client";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { steps } from "./steps";

interface WizardSidebarProps {
  currentStep: string;
  onNavigate: (step: string) => void;
}

export function WizardSidebar({ currentStep, onNavigate }: WizardSidebarProps) {
  return (
    <div>
      {/* Mobile: barra horizontal con Tabs */}
      <div className="md:hidden mb-4">
        <Tabs
          value={currentStep}
          onValueChange={(val) => onNavigate(val)}
          className="w-full"
        >
          <div className="w-full no-scrollbar overflow-x-auto overflow-y-hidden">
            <TabsList
              className="
                flex min-w-max whitespace-nowrap
                overflow-x-auto overflow-y-hidden
                md:overflow-visible md:flex-wrap
              "
            >
              {steps.map((s) => (
                <TabsTrigger key={s.key} value={s.key} className="shrink-0">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Desktop: sidebar vertical con Card */}
      <div className="hidden md:block">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Pasos</CardTitle>
          </CardHeader>
          <div className="flex flex-col space-y-2 p-4">
            {steps.map((s) => (
              <Button
                key={s.key}
                variant={currentStep === s.key ? "secondary" : "ghost"}
                className={cn(
                  "justify-start",
                  currentStep === s.key && "font-semibold",
                )}
                onClick={() => onNavigate(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
