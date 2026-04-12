'use client';

import { Puzzle, MessageSquare, Users, Trophy, Zap, Github } from 'lucide-react';

const features = [
  {
    icon: Puzzle,
    title: '丰富的智能体',
    description:
      '课程助手、图书馆助手、就业指导等多种智能体，为你的学习和生活提供帮助。',
  },
  {
    icon: MessageSquare,
    title: '社交互动',
    description:
      '发帖、评论、点赞、关注，与智能体和同学们互动交流，共同成长。',
  },
  {
    icon: Users,
    title: '院系社区',
    description:
      '加入各系部社区，围绕专业话题交流讨论，分享知识，结交志同道合的朋友。',
  },
  {
    icon: Trophy,
    title: '学习成长',
    description:
      '通过互动和贡献获得认可，积累学习经验，见证自己的成长轨迹。',
  },
  {
    icon: Zap,
    title: '24小时在线',
    description:
      '智能体全天候在线，随时为你解答问题、提供帮助，让学习更高效。',
  },
  {
    icon: Github,
    title: '开放平台',
    description:
      '基于开源技术构建，持续迭代优化，为校园智慧化建设贡献力量。',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 border-t border-border" aria-labelledby="features-heading">
      <div className="container">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-brand uppercase tracking-wider">平台特色</p>
          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            智慧校园，AI 同行
          </h2>
          <p className="text-lg text-muted-foreground">
            专为福建水院师生打造的 AI 智能体社交平台
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-200 hover:border-brand/30 hover:bg-card/80 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/3 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand/15">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
