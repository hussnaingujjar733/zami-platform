"use client";

import CountUp from "react-countup";
import { motion } from "framer-motion";
import {
Camera,
CheckCircle2,
ShieldCheck,
Sparkles,
Euro,
Activity
} from "lucide-react";

import { GlassCard } from "./ui/GlassCard";

const timeline=[
{
icon:CheckCircle2,
title:"Inspection terminée",
detail:"Aujourd'hui • 10:34"
},
{
icon:Sparkles,
title:"Plan IA généré",
detail:"3 scénarios disponibles"
},
{
icon:Camera,
title:"Photos analysées",
detail:"12 nouvelles photos"
},
{
icon:ShieldCheck,
title:"Contrôle qualité",
detail:"En cours..."
}
];

export function DashboardPreview(){

return(

<motion.div
initial={{opacity:0,scale:.92}}
animate={{opacity:1,scale:1}}
transition={{duration:.8}}
className="relative"
>

<div className="absolute -top-12 -right-12 h-52 w-52 rounded-full bg-emerald-500/20 blur-[90px]" />

<div className="rounded-[34px] border border-white/10 bg-[#06120d]/90 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,.55)] overflow-hidden">

<div className="p-7">

<div className="flex justify-between items-center">

<div>

<p className="text-xs uppercase tracking-[0.25em] font-black text-emerald-400">
ESPACE PROPRIÉTAIRE
</p>

<h3 className="mt-2 text-xl font-black text-white">
Projet rénovation
</h3>

</div>

<div className="flex items-center gap-2">

<div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"/>

<span className="text-sm text-emerald-300">
IA Active
</span>

</div>

</div>

<div className="mt-8">

<div className="flex justify-between">

<div>

<div className="text-sm text-slate-400">
Avancement
</div>

<div className="mt-2 text-5xl font-black text-white">

<CountUp end={78}/>

<span className="text-emerald-400">
%
</span>

</div>

</div>

<Activity className="h-10 w-10 text-emerald-400"/>

</div>

<div className="mt-5 h-3 rounded-full bg-white/10 overflow-hidden">

<motion.div

initial={{width:0}}

animate={{width:"78%"}}

transition={{duration:2}}

className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-300"

/>

</div>

</div>

<div className="mt-8 space-y-4">

{timeline.map((item)=>{

const Icon=item.icon;

return(

<motion.div

key={item.title}

initial={{opacity:0,x:30}}

animate={{opacity:1,x:0}}

transition={{delay:.25}}

className="flex gap-4 rounded-2xl bg-white/[0.03] p-4"

>

<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">

<Icon className="h-5 w-5 text-emerald-400"/>

</div>

<div>

<div className="font-bold text-white">
{item.title}
</div>

<div className="text-sm text-slate-500">
{item.detail}
</div>

</div>

</motion.div>

);

})}

</div>

<div className="grid grid-cols-3 gap-4 mt-8">

<GlassCard>

<Euro className="text-emerald-400"/>

<div className="mt-3 text-3xl font-black text-white">

<CountUp end={2400} separator=" "/>€

</div>

<div className="text-xs text-slate-500">
Économie/an
</div>

</GlassCard>

<GlassCard>

<ShieldCheck className="text-emerald-400"/>

<div className="mt-3 text-3xl font-black text-white">

9.2

</div>

<div className="text-xs text-slate-500">
Qualité IA
</div>

</GlassCard>

<GlassCard>

<Sparkles className="text-emerald-400"/>

<div className="mt-3 text-3xl font-black text-white">

32K

</div>

<div className="text-xs text-slate-500">
Budget
</div>

</GlassCard>

</div>

</div>

</div>

</motion.div>

);

}
