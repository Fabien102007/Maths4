from manim import *
import numpy as np

# Vertical 9:16 educational short — render with:
# manim -pqh convergence.py ConvergenceShort
config.pixel_width = 1080
config.pixel_height = 1920
config.frame_width = 9
config.frame_height = 16
config.background_color = "#07111F"

class ConvergenceShort(Scene):
    def construct(self):
        cyan = "#58D5FF"
        gold = "#FFC857"
        muted = "#91A4BA"
        white = "#F4F7FB"

        title = Text("LA BEAUTÉ DE LA", font_size=38, weight=BOLD, color=muted)
        title2 = Text("CONVERGENCE", font_size=66, weight=BOLD, color=white)
        title_group = VGroup(title, title2).arrange(DOWN, buff=0.14)
        title_group.to_edge(UP, buff=1.1)
        self.play(FadeIn(title, shift=UP*0.2), Write(title2), run_time=1.8)

        formula = MathTex(r"u_n=\frac{1}{n}", font_size=76, color=cyan)
        formula.next_to(title_group, DOWN, buff=0.8)
        self.play(Write(formula), run_time=1.2)

        # Number line
        axis = NumberLine(
            x_range=[0, 1.2, 0.2],
            length=7.2,
            include_numbers=True,
            decimal_number_config={"num_decimal_places": 1},
            color=muted,
            stroke_width=3,
            font_size=28,
        )
        axis.move_to(DOWN*1.0)
        zero_label = MathTex("0", color=gold, font_size=54).next_to(axis, DOWN, buff=0.75)
        limit_label = MathTex(r"\lim_{n\to\infty}u_n=0", color=gold, font_size=48)
        limit_label.next_to(axis, DOWN, buff=1.55)
        self.play(Create(axis), FadeIn(zero_label), run_time=1.4)

        dots = VGroup()
        labels = VGroup()
        for n in [1, 2, 3, 4, 6, 10, 20]:
            x = 1/n
            dot = Dot(axis.n2p(x), radius=0.105, color=cyan)
            dots.add(dot)
        self.play(LaggedStart(*[FadeIn(d, scale=1.5) for d in dots], lag_ratio=0.18), run_time=2.2)

        caption = Text("Chaque terme se rapproche de 0…", font_size=34, color=white)
        caption.move_to(DOWN*3.1)
        self.play(FadeIn(caption, shift=UP*0.15), run_time=0.8)

        # Animate successive terms converging toward the origin
        moving = Dot(axis.n2p(1), radius=0.15, color=gold)
        self.play(FadeIn(moving, scale=1.8))
        for n in [2, 3, 4, 6, 10, 20, 40]:
            self.play(
                moving.animate.move_to(axis.n2p(1/n)),
                run_time=0.42,
                rate_func=smooth,
            )
        self.play(Transform(caption, Text("…sans jamais être négatif.", font_size=34, color=white).move_to(caption)))
        self.wait(0.5)

        self.play(FadeOut(caption), FadeOut(moving), FadeOut(dots), FadeOut(zero_label))
        self.play(Write(limit_label), run_time=1.4)

        final = Text("La limite est 0.", font_size=48, weight=BOLD, color=cyan)
        final.next_to(limit_label, DOWN, buff=0.65)
        self.play(FadeIn(final, shift=UP*0.2), run_time=1.0)
        self.wait(2)
