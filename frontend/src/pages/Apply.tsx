import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { internships } from "@/data/internships";
import { Building2, ChevronLeft, Clock3, MapPin, Send, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const Apply = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const internship = internships.find((item) => item.id === id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    resume: null as File | null,
    motivation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!internship) {
    return (
      <div className="brand-shell min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <Card className="section-card border-white/70 p-8 text-center">
            <CardTitle className="text-3xl">Opportunity not found</CardTitle>
            <CardDescription className="mt-2 text-base">
              The listing you tried to open is no longer available in this preview flow.
            </CardDescription>
            <CardContent className="pt-6">
              <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800" onClick={() => navigate("/openings")}>
                Back to opportunities
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setFormData((current) => ({
        ...current,
        resume: file,
      }));
      return;
    }

    toast.error("Please upload a PDF file");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name || !formData.email || !formData.resume || !formData.motivation) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("Application submitted successfully!", {
      description: "Your application has been captured in the current preview flow.",
    });

    setIsSubmitting(false);

    setTimeout(() => {
      navigate("/openings");
    }, 1800);
  };

  return (
    <div className="brand-shell min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <Button
              variant="ghost"
              className="rounded-full text-slate-600 hover:bg-white/70"
              onClick={() => navigate("/openings")}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to opportunities
            </Button>

            <Card className="section-card overflow-hidden border-white/70">
              <div className="bg-[image:var(--gradient-primary)] px-6 py-8 text-white">
                <Badge className="rounded-full bg-white/14 px-3 py-1 text-white hover:bg-white/14">Application preview</Badge>
                <h1 className="mt-4 text-4xl font-semibold">{internship.title}</h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-white/85">{internship.description}</p>
              </div>
              <CardContent className="grid gap-4 p-6">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-900/5 px-4 py-3 text-slate-700">
                  <MapPin className="h-4 w-4 text-primary" />
                  {internship.location}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-900/5 px-4 py-3 text-slate-700">
                  <Clock3 className="h-4 w-4 text-primary" />
                  {internship.duration}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-900/5 px-4 py-3 text-slate-700">
                  <Building2 className="h-4 w-4 text-primary" />
                  {internship.department}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="section-card border-white/70">
            <CardHeader>
              <CardTitle className="text-3xl">Submit your application</CardTitle>
              <CardDescription className="text-base">
                Share your details, attach your resume, and add a short note about why this role fits your direction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="rounded-2xl border-slate-200 bg-white/85"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="rounded-2xl border-slate-200 bg-white/85"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume">Resume (PDF)</Label>
                  <Input
                    ref={fileInputRef}
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-2xl border-slate-200 bg-white/85 py-6 text-slate-700 hover:bg-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {formData.resume ? formData.resume.name : "Upload your resume"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">Why this role</Label>
                  <Textarea
                    id="motivation"
                    name="motivation"
                    rows={7}
                    placeholder="Share what draws you to this opportunity, how your skills align, and what kind of impact you want to make."
                    value={formData.motivation}
                    onChange={handleInputChange}
                    className="rounded-2xl border-slate-200 bg-white/85"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="button-glow h-14 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  {isSubmitting ? "Submitting..." : "Send application"}
                  {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Apply;
