import pygame
import random
import math

# Initialize Pygame
pygame.init()

# Screen settings
WIDTH = 800
HEIGHT = 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Snake.io Tribute")

# Colors
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)

# Snake class
class Snake:
    def __init__(self):
        self.segments = [(WIDTH // 2, HEIGHT // 2)]
        self.radius = 10
        self.speed = 5

    def move(self, target_pos):
        head_x, head_y = self.segments[0]
        target_x, target_y = target_pos
        
        # Calculate angle to target
        dx = target_x - head_x
        dy = target_y - head_y
        distance = math.sqrt(dx**2 + dy**2)
        
        if distance > 0:
            dx = dx / distance
            dy = dy / distance
            
            new_x = head_x + dx * self.speed
            new_y = head_y + dy * self.speed
            
            # Check screen boundaries (death condition)
            if (new_x - self.radius < 0 or new_x + self.radius > WIDTH or 
                new_y - self.radius < 0 or new_y + self.radius > HEIGHT):
                return False  # Indicates collision with wall
            
            self.segments.insert(0, (new_x, new_y))
            if len(self.segments) > self.radius * 2:  # Length based on radius
                self.segments.pop()
            return True  # Successful move

    def grow(self):
        self.radius += 2

    def draw(self):
        for segment in self.segments:
            pygame.draw.circle(screen, GREEN, (int(segment[0]), int(segment[1])), self.radius)

    def check_collision(self, pos, radius):
        head_x, head_y = self.segments[0]
        dist = math.sqrt((head_x - pos[0])**2 + (head_y - pos[1])**2)
        return dist < (self.radius + radius)

# Bot class
class Bot:
    def __init__(self):
        self.x = random.randint(0, WIDTH)
        self.y = random.randint(0, HEIGHT)
        self.radius = 8
        self.speed = 3
        self.direction = random.uniform(0, 2 * math.pi)

    def move(self):
        self.x += math.cos(self.direction) * self.speed
        self.y += math.sin(self.direction) * self.speed
        
        # Bounce off walls
        if self.x - self.radius < 0 or self.x + self.radius > WIDTH:
            self.direction = math.pi - self.direction
        if self.y - self.radius < 0 or self.y + self.radius > HEIGHT:
            self.direction = -self.direction
            
        self.x = max(self.radius, min(WIDTH - self.radius, self.x))
        self.y = max(self.radius, min(HEIGHT - self.radius, self.y))

    def draw(self):
        pygame.draw.circle(screen, BLUE, (int(self.x), int(self.y)), self.radius)

# Food class
class Food:
    def __init__(self):
        self.x = random.randint(0, WIDTH)
        self.y = random.randint(0, HEIGHT)
        self.radius = 5

    def draw(self):
        pygame.draw.circle(screen, RED, (int(self.x), int(self.y)), self.radius)

# Game setup
snake = Snake()
bots = [Bot() for _ in range(5)]  # Start with 5 bots
foods = [Food() for _ in range(10)]  # Start with 10 food dots
clock = pygame.time.Clock()
running = True

# Main game loop
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Get mouse position
    mouse_pos = pygame.mouse.get_pos()
    
    # Move snake (check for wall collision)
    if not snake.move(mouse_pos):
        running = False  # Die when hitting wall
    
    # Move bots
    for bot in bots[:]:
        bot.move()
        
        # Check if bot collides with snake
        if snake.check_collision((bot.x, bot.y), bot.radius):
            # Turn bot into food dots
            for _ in range(3):  # Create 3 food dots per bot
                foods.append(Food())
            bots.remove(bot)
            snake.grow()
            bots.append(Bot())  # Add new bot to maintain population
    
    # Check food collision
    for food in foods[:]:
        if snake.check_collision((food.x, food.y), food.radius):
            foods.remove(food)
            snake.grow()
            foods.append(Food())  # Add new food to maintain count
    
    # Check if snake hits bot (game over)
    for bot in bots:
        if snake.check_collision((bot.x, bot.y), bot.radius):
            running = False
            break

    # Draw everything
    screen.fill(WHITE)
    for food in foods:
        food.draw()
    for bot in bots:
        bot.draw()
    snake.draw()
    
    pygame.display.flip()
    clock.tick(60)  # 60 FPS

pygame.quit()