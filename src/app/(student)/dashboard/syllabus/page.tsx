"use client";

import React, { useState } from "react";
import { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  Calculator, 
  Binary, 
  Brain, 
  Globe,
  CheckCircle2,
  ListTodo
} from "lucide-react";
import { Input } from "@/components/ui/input";

const SYLLABUS_DATA = [
  {
    category: "Computer Science",
    icon: Binary,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    topics: [
      "Problem Solving with Computer Programming",
      "Digital Fundamentals",
      "Computer Organization",
      "Database Fundamentals",
      "Organization of a computer",
      "Central Processing Unit (CPU)",
      "Structure of instructions in CPU",
      "Input/output devices",
      "Computer memory",
      "Memory organization",
      "Back-up devices",
      "Representation of characters",
      "Representation of integers",
      "Representation of fractions",
      "Binary representation",
      "Hexadecimal representations",
      "Binary Arithmetic",
      "Addition",
      "Subtraction",
      "Division",
      "Multiplication",
      "Signed arithmetic",
      "Two’s complement arithmetic",
      "Floating point representation of numbers",
      "Normalized floating point representation",
      "Boolean algebra",
      "Truth tables",
      "Venn diagrams",
      "Basics of Digital Logic",
      "Block structure of computers",
      "Communication between processor and I/O devices",
      "Interrupts"
    ]
  },
  {
    category: "Mathematics & Statistics",
    icon: Calculator,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    topics: [
      "Set Theory",
      "Relations and Functions",
      "Logic",
      "Trigonometry",
      "Matrices and Determinants",
      "Coordinate Geometry",
      "Differential Calculus",
      "Integral Calculus",
      "Ordinary Differential Equations",
      "Vector Algebra",
      "Probability",
      "Statistics"
    ]
  },
  {
    category: "Quantitative Aptitude & Logical Reasoning",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    topics: [
      "Number Systems",
      "Percentages",
      "Profit and Loss",
      "Simple and Compound Interest",
      "Ratio and Proportion",
      "Averages",
      "Time and Work",
      "Time, Speed and Distance",
      "Mixtures and Alligations",
      "Linear and Quadratic Equations",
      "Progressions (AP, GP)",
      "Permutations and Combinations",
      "Probability",
      "Data Interpretation (Bar charts, Pie charts, Line graphs, Tables)",
      "Blood Relations",
      "Coding-Decoding",
      "Syllogisms",
      "Series Completion",
      "Analogies",
      "Direction Sense",
      "Seating Arrangement",
      "Puzzles",
      "Logical Sequences"
    ]
  },
  {
    category: "English Language & Comprehension",
    icon: BookOpen,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    topics: [
      "Vocabulary",
      "Synonyms",
      "Antonyms",
      "Analogies",
      "Sentence Correction",
      "Error Spotting",
      "Idioms and Phrases",
      "One-word Substitution",
      "Fill in the blanks (Grammar-based)",
      "Reading Comprehension",
      "Jumbled Sentences/Paragraphs",
      "Verbal Ability"
    ]
  },
  {
    category: "General Knowledge & Current Affairs",
    icon: Globe,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    topics: [
      "Awards and Honors",
      "Sports",
      "Books and Authors",
      "Science and Technology",
      "Indian History and Geography",
      "Indian Economy",
      "Indian Constitution and Politics",
      "Current Affairs (National and International)"
    ]
  }
];

export default function SyllabusPage() {
  const [search, setSearch] = useState("");

  const filteredSyllabus = SYLLABUS_DATA.map(category => ({
    ...category,
    topics: category.topics.filter(topic => 
      topic.toLowerCase().includes(search.toLowerCase()) ||
      category.category.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(category => category.topics.length > 0);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <ListTodo className="h-3 w-3" />
            LBS MCA Entrance 2024
          </div>
          <h1 className="text-4xl font-black tracking-tight">Syllabus</h1>
          <p className="text-muted-foreground max-w-xl">
            Detailed breakdown of all subjects and topics for the LBS MCA Entrance examination.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 rounded-2xl bg-card border-border/50 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="grid gap-6">
        <Accordion type="multiple" defaultValue={SYLLABUS_DATA.map(d => d.category)} className="w-full">
          {filteredSyllabus.map((category, idx) => {
            const Icon = category.icon;
            return (
              <AccordionItem key={category.category} value={category.category} className="border-none mb-4">
                <AccordionTrigger className="hover:no-underline p-0 group">
                  <div className="flex items-center gap-4 w-full p-4 rounded-2xl bg-card border border-border/50 group-hover:border-primary/20 transition-all group-hover:shadow-lg group-hover:shadow-primary/5">
                    <div className={`p-3 rounded-xl ${category.bgColor} ${category.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-lg">{category.category}</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                        {category.topics.length} {category.topics.length === 1 ? 'Topic' : 'Topics'}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.topics.map((topic, topicIdx) => (
                      <div 
                        key={topicIdx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border/50 hover:bg-muted/50 transition-all group/topic"
                      >
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 ${category.color} opacity-40 group-hover/topic:opacity-100 transition-opacity`} />
                        <span className="text-sm font-medium text-muted-foreground group-hover/topic:text-foreground transition-colors">
                          {topic}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {filteredSyllabus.length === 0 && (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50">
            <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold">No topics found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search terms</p>
          </div>
        )}
      </div>

      <div className="bg-linear-to-br from-primary/10 via-background to-background border border-primary/20 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BookOpen className="h-32 w-32 text-primary" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <Badge className="bg-primary text-primary-foreground border-none">Pro Tip</Badge>
          <h2 className="text-2xl font-bold italic">"Consistency is the key to mastering these topics."</h2>
          <p className="text-muted-foreground leading-relaxed">
            Focus on understanding the core concepts of Computer Science and Mathematics, as they carry significant weightage. Regular practice of Quantitative Aptitude and Logical Reasoning will improve your speed and accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}

