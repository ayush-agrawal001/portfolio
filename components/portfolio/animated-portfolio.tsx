"use client";

import { HackathonCard } from "@/components/ui_portfolio_components/hackathon-card";
import BlurFade from "@/components/ui_portfolio_components/magicui/blur-fade";
import BlurFadeText from "@/components/ui_portfolio_components/magicui/blur-fade-text";
import { ProjectCard } from "@/components/ui_portfolio_components/project-card";
import { ResumeCard } from "@/components/ui_portfolio_components/resume-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui_portfolio_components/ui/avatar";
import { Badge } from "@/components/ui_portfolio_components/ui/badge";
import { DATA } from "@/data_ui_portfolio/resume";
import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Navbar from "@/components/ui_portfolio_components/navbar";
import { TooltipProvider } from "@/components/ui_portfolio_components/ui/tooltip";

const BLUR_FADE_DELAY = 0.04;

export function AnimatedPortfolio() {
  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className={cn(
          "min-h-screen bg-background font-sans antialiased text-foreground"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
      >
          <div className="max-w-2xl mx-auto py-12 sm:py-24 px-6">
            <main className="flex flex-col space-y-10">
              <section id="hero">
                <div className="mx-auto w-full max-w-2xl space-y-8">
                  <div className="gap-2 flex justify-between">
                    <div className="flex-col flex flex-1 space-y-1.5 justify-center items-center">

                      <BlurFade delay={BLUR_FADE_DELAY}>
                        <Avatar className="size-48 border">
                          <AvatarImage alt={DATA.name} src={DATA.avatarUrl} />
                          <AvatarFallback>{DATA.initials}</AvatarFallback>
                        </Avatar>
                      </BlurFade>
                      <BlurFadeText
                        delay={BLUR_FADE_DELAY}
                        className="text-3xl text-center font-bold tracking-tighter sm:text-5xl xl:text-6xl/none"
                        yOffset={8}
                        text={`${DATA.name} `}
                      />
                      <BlurFadeText
                        className="max-w-[600px] text-center md:text-xl"
                        delay={BLUR_FADE_DELAY}
                        text={DATA.description}
                      />
                    </div>
                  </div>
                </div>
              </section>
              <section id="about">
                <BlurFade delay={BLUR_FADE_DELAY * 3}>
                  <h2 className="text-xl font-bold">About</h2>
                </BlurFade>
                <BlurFade delay={BLUR_FADE_DELAY * 4}>
                  <div className="prose max-w-full text-pretty font-sans text-sm text-muted-foreground dark:prose-invert">
                    <Markdown>
                      {DATA.summary}
                    </Markdown>
                  </div>
                </BlurFade>
              </section>
              <section id="work">
                <div className="flex min-h-0 flex-col gap-y-3">
                  <BlurFade delay={BLUR_FADE_DELAY * 5}>
                    <h2 className="text-xl font-bold">Work Experience</h2>
                  </BlurFade>
                  {DATA.work.map((work, id) => (
                    <BlurFade
                      key={work.company}
                      delay={BLUR_FADE_DELAY * 6 + id * 0.05}
                    >
                      <ResumeCard
                        key={work.company}
                        logoUrl={work.logoUrl}
                        altText={work.company}
                        title={work.company}
                        subtitle={work.title}
                        href={work.href}
                        badges={work.badges}
                        period={`${work.start} - ${work.end ?? "Present"}`}
                        description={work.description}
                      />
                    </BlurFade>
                  ))}
                </div>
              </section>
              <section id="education">
                <div className="flex min-h-0 flex-col gap-y-3">
                  <BlurFade delay={BLUR_FADE_DELAY * 7}>
                    <h2 className="text-xl font-bold">Education</h2>
                  </BlurFade>
                  {DATA.education.map((education, id) => (
                    <BlurFade
                      key={education.school}
                      delay={BLUR_FADE_DELAY * 8 + id * 0.05}
                    >
                      <ResumeCard
                        key={education.school}
                        href={education.href}
                        logoUrl={education.logoUrl}
                        altText={education.school}
                        title={education.school}
                        subtitle={education.degree}
                        period={`${education.start} - ${education.end}`}
                      />
                    </BlurFade>
                  ))}
                </div>
              </section>
              <section id="skills">
                <div className="flex min-h-0 flex-col gap-y-3">
                  <BlurFade delay={BLUR_FADE_DELAY * 9}>
                    <h2 className="text-xl font-bold">Skills</h2>
                  </BlurFade>
                  <div className="flex flex-wrap gap-1">
                    {DATA.skills.map((skill, id) => (
                      <BlurFade key={skill} delay={BLUR_FADE_DELAY * 10 + id * 0.05}>
                        <Badge key={skill}>{skill}</Badge>
                      </BlurFade>
                    ))}
                  </div>
                </div>
              </section>
              <section id="projects">
                <div className="space-y-12 w-full py-12">
                  <BlurFade delay={BLUR_FADE_DELAY * 11}>
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-foreground text-background px-3 py-1 text-sm">
                          My Projects
                        </div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                          Check out my latest work
                        </h2>
                        <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                          I&apos;ve worked on a variety of projects, from simple
                          websites to complex web applications. Here are a few of my
                          favorites.
                        </p>
                      </div>
                    </div>
                  </BlurFade>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-[800px] mx-auto">
                    {DATA.projects.map((project, id) => (
                      <BlurFade
                        key={project.title}
                        delay={BLUR_FADE_DELAY * 12 + id * 0.05}
                      >
                        <ProjectCard
                          href={project.href}
                          key={project.title}
                          title={project.title}
                          description={project.description}
                          dates={project.dates}
                          tags={project.technologies}
                          image={project.image}
                          video={project.video}
                          ytvideo={project.ytvideo}
                          xpost={project.xpost}
                          links={project.links}
                        />
                      </BlurFade>
                    ))}
                  </div>
                </div>
              </section>
              <section id="ChatGptReview">
                <div className="space-y-12 w-full py-12">
                  <BlurFade delay={BLUR_FADE_DELAY * 11}>
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-foreground text-background px-3 py-1 text-sm">
                          Review
                        </div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                          ChatGPT Review
                        </h2>
                        <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                          I asked ChatGPT to describe me. Here is what it said:
                        </p>

                      </div>
                    </div>
                  </BlurFade>
                  <div className="flex flex-col items-center justify-center max-w-[800px] mx-auto">
                    <Image src="/chatgpt_review.png" alt="ChatGPT Review" width={800} height={800} />
                  </div>
                </div>
              </section>
              <section id="hackathons">
                <div className="space-y-12 w-full py-12">
                  <BlurFade delay={BLUR_FADE_DELAY * 13}>
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                      <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-foreground text-background px-3 py-1 text-sm">
                          Time Line
                        </div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                          You can just do things!!
                        </h2>
                        <p className="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                          I am a Passionate Developer who loves to build things. I have
                          been working on projects for over a year now. I have built
                          several projects in the past and I am currently working on
                          building a new project.
                        </p>
                      </div>
                    </div>
                  </BlurFade>
                  <BlurFade delay={BLUR_FADE_DELAY * 14}>
                    <ul className="mb-4 ml-4 divide-y divide-dashed border-l">
                      {DATA.hackathons.map((project, id) => (
                        <BlurFade
                          key={project.title + project.dates}
                          delay={BLUR_FADE_DELAY * 15 + id * 0.05}
                        >
                          <HackathonCard
                            title={project.title}
                            description={project.description}
                            location={project.location}
                            dates={project.dates}
                            image={project.image}
                            links={project.links}
                          />
                        </BlurFade>
                      ))}
                    </ul>
                  </BlurFade>
                </div>
              </section>
            </main>
          </div>
          <Navbar />
        </motion.div>
      </TooltipProvider>
  );
}
