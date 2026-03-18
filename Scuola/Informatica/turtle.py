import turtle
import math


def draw_circle(t, x, y, r, color):
	t.penup()
	t.goto(x, y - r)
	t.pendown()
	t.fillcolor(color)
	t.begin_fill()
	t.circle(r)
	t.end_fill()
	t.penup()


def draw_snowman():
	screen = turtle.Screen()
	screen.title("Snowman")
	screen.bgcolor("#87CEEB")

	t = turtle.Turtle()
	t.hideturtle()
	t.speed(0)
	t.pensize(2)
	t.color("black")

	# body (bottom -> top)
	draw_circle(t, 0, -120, 80, "white")
	draw_circle(t, 0, -20, 55, "white")
	head_center_y = 70
	draw_circle(t, 0, head_center_y, 35, "white")

	# eyes
	t.goto(-12, head_center_y + 15)
	t.dot(8, "black")
	t.goto(12, head_center_y + 15)
	t.dot(8, "black")

	# carrot nose
	t.goto(0, head_center_y + 5)
	t.setheading(0)
	t.color("orange")
	t.pendown()
	t.begin_fill()
	t.forward(30)
	t.left(120)
	t.forward(10)
	t.left(120)
	t.forward(10)
	t.end_fill()
	t.penup()
	t.color("black")

	# mouth (small dots)
	mouth = [(-15, head_center_y - 5), (-7, head_center_y - 10), (0, head_center_y - 12), (7, head_center_y - 10), (15, head_center_y - 5)]
	for x, y in mouth:
		t.goto(x, y)
		t.dot(5, "black")

	# buttons on torso
	t.goto(0, 10)
	t.dot(10, "black")
	t.goto(0, -10)
	t.dot(10, "black")
	t.goto(0, -30)
	t.dot(10, "black")

	# arms
	t.goto(-35, 0)
	t.pendown()
	t.goto(-100, 40)
	t.penup()
	t.goto(35, 0)
	t.pendown()
	t.goto(100, 40)
	t.penup()

	# scarf
	t.goto(-30, head_center_y - 10)
	t.fillcolor("red")
	t.pendown()
	t.begin_fill()
	t.goto(30, head_center_y - 10)
	t.goto(30, head_center_y - 20)
	t.goto(-30, head_center_y - 20)
	t.goto(-30, head_center_y - 10)
	t.end_fill()
	t.penup()

	# simple top hat
	hat_top = head_center_y + 35
	t.goto(-30, hat_top)
	t.fillcolor("black")
	t.pendown()
	t.begin_fill()
	t.goto(30, hat_top)
	t.goto(30, hat_top + 15)
	t.goto(-30, hat_top + 15)
	t.goto(-30, hat_top)
	t.end_fill()
	t.penup()


if __name__ == "__main__":
	draw_snowman()
	turtle.done()
 
 