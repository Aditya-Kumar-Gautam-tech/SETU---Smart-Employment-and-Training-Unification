import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SkillsConfirmationDialogProps {
  open: boolean;
  initialSkills: string[];
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (skills: string[]) => Promise<void> | void;
}

function normalizeSkills(skills: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

const SkillsConfirmationDialog = ({
  open,
  initialSkills,
  isSaving,
  onOpenChange,
  onConfirm,
}: SkillsConfirmationDialogProps) => {
  const [skills, setSkills] = useState<string[]>(() => normalizeSkills(initialSkills));
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (open) {
      setSkills(normalizeSkills(initialSkills));
      setNewSkill("");
    }
  }, [initialSkills, open]);

  const canSave = useMemo(() => skills.length > 0 && !isSaving, [isSaving, skills.length]);

  const handleAddSkill = () => {
    const candidate = newSkill.trim();
    if (!candidate) {
      return;
    }

    setSkills((current) => normalizeSkills([...current, candidate]));
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((current) => current.filter((skill) => skill !== skillToRemove));
  };

  const handleConfirm = async () => {
    await onConfirm(normalizeSkills(skills));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Your Skills</DialogTitle>
          <DialogDescription>
            Review the parser output, remove anything inaccurate, and add any missing skills before we fetch matching jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-skill">Add a skill</Label>
            <div className="flex gap-2">
              <Input
                id="new-skill"
                value={newSkill}
                onChange={(event) => setNewSkill(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
              />
              <Button type="button" variant="outline" onClick={handleAddSkill}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex min-h-24 flex-wrap gap-2 rounded-lg border border-dashed border-border p-4">
            {skills.length > 0 ? (
              skills.map((skill) => (
                <Badge key={skill} className="flex items-center gap-1 px-3 py-1 text-sm">
                  <span>{skill}</span>
                  <button type="button" onClick={() => handleRemoveSkill(skill)} className="rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Add at least one skill to continue.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canSave}>
            {isSaving ? "Saving..." : "Confirm Skills"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SkillsConfirmationDialog;
