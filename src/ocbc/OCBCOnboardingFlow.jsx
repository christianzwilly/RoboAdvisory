import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Label } from '@/components/ui/Label.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Select, SelectItem } from '@/components/ui/Select.jsx';
import { Switch } from '@/components/ui/Switch.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/Dialog.jsx';

export default function OCBCOnboardingFlow(){
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OCBC Themed Investment — Onboarding</CardTitle>
          <CardDescription>Placeholder component exported as default so the app runs. Replace with full flow JSX.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" />
          </div>

          <div>
            <Label>Risk Profile</Label>
            <RadioGroup value="balanced" onValueChange={() => {}}>
              <RadioGroupItem value="conservative">Conservative</RadioGroupItem>
              <RadioGroupItem value="balanced">Balanced</RadioGroupItem>
              <RadioGroupItem value="aggressive">Aggressive</RadioGroupItem>
            </RadioGroup>
          </div>

          <div>
            <Label>Model Portfolio</Label>
            <Select value="C3" onValueChange={() => {}}>
              <SelectItem value="C0">C0 — Conservative</SelectItem>
              <SelectItem value="C3">C3 — Balanced</SelectItem>
              <SelectItem value="C6">C6 — Aggressive</SelectItem>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked onCheckedChange={() => {}} />
            <Label>Enable rebalancing notifications</Label>
          </div>

          <div className="flex gap-3">
            <Button>Continue</Button>
            <Dialog>
              <DialogTrigger>View disclosures</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Important disclosures</DialogTitle>
                  <DialogDescription>This is a placeholder. The full OCBC flow content will appear here.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
