import pygame
import random
import time

# Initialize Pygame
pygame.init()

# Constants
WINDOW_SIZE = 600
GRID_SIZE = 8
CELL_SIZE = WINDOW_SIZE // GRID_SIZE
COLORS = [
    (255, 0, 0),    # Red
    (0, 255, 0),    # Green
    (0, 0, 255),    # Blue
    (255, 255, 0),  # Yellow
    (255, 0, 255),  # Purple
    (0, 255, 255)   # Cyan
]
FALL_SPEED = 5

# Set up display
screen = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE))
pygame.display.set_caption("Candy Crush Clone")
clock = pygame.time.Clock()

class Candy:
    def __init__(self, color_idx, x, y):
        self.color_idx = color_idx
        self.x = x
        self.y = y
        self.target_y = y
        self.scale = 1.0
        self.scale_speed = 0

class Game:
    def __init__(self):
        self.grid = [[Candy(random.randint(0, len(COLORS)-1), x*CELL_SIZE, y*CELL_SIZE) 
                     for x in range(GRID_SIZE)] 
                     for y in range(GRID_SIZE)]
        self.selected = None
        self.score = 0
        self.font = pygame.font.Font(None, 36)

    def draw(self):
        screen.fill((255, 255, 255))
        
        # Draw grid
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                if self.grid[y][x]:
                    candy = self.grid[y][x]
                    color = COLORS[candy.color_idx]
                    size = int((CELL_SIZE//2 - 5) * candy.scale)
                    pygame.draw.circle(screen, color,
                                     (int(candy.x + CELL_SIZE//2), 
                                      int(candy.y + CELL_SIZE//2)), 
                                     size)
                    pygame.draw.circle(screen, (0, 0, 0),
                                     (int(candy.x + CELL_SIZE//2), 
                                      int(candy.y + CELL_SIZE//2)), 
                                     size, 2)

        # Draw selection
        if self.selected:
            x, y = self.selected
            pygame.draw.rect(screen, (0, 0, 0),
                           (x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE), 3)

        # Draw score
        score_text = self.font.render(f"Score: {self.score}", True, (0, 0, 0))
        screen.blit(score_text, (10, 10))

    def update(self):
        # Update falling animation
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                if self.grid[y][x]:
                    candy = self.grid[y][x]
                    if candy.y < candy.target_y:
                        candy.y = min(candy.y + FALL_SPEED, candy.target_y)
                    # Update scale animation
                    if candy.scale_speed != 0:
                        candy.scale += candy.scale_speed
                        if candy.scale > 1.1 or candy.scale < 0.9:
                            candy.scale_speed = -candy.scale_speed
                        if abs(candy.scale - 1.0) < 0.05:
                            candy.scale = 1.0
                            candy.scale_speed = 0

    def get_cell(self, pos):
        x, y = pos
        return x // CELL_SIZE, y // CELL_SIZE

    def swap(self, pos1, pos2):
        x1, y1 = pos1
        x2, y2 = pos2
        self.grid[y1][x1], self.grid[y2][x2] = self.grid[y2][x2], self.grid[y1][x1]
        # Set new target positions after swap
        self.grid[y1][x1].target_y = y1 * CELL_SIZE
        self.grid[y2][x2].target_y = y2 * CELL_SIZE
        # Add scale animation
        self.grid[y1][x1].scale_speed = 0.05
        self.grid[y2][x2].scale_speed = 0.05

    def check_matches(self):
        matches = set()
        
        # Check horizontal matches
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE-2):
                if (self.grid[y][x] and self.grid[y][x+1] and self.grid[y][x+2] and
                    self.grid[y][x].color_idx == self.grid[y][x+1].color_idx == self.grid[y][x+2].color_idx):
                    matches.update([(x, y), (x+1, y), (x+2, y)])

        # Check vertical matches
        for y in range(GRID_SIZE-2):
            for x in range(GRID_SIZE):
                if (self.grid[y][x] and self.grid[y+1][x] and self.grid[y+2][x] and
                    self.grid[y][x].color_idx == self.grid[y+1][x].color_idx == self.grid[y+2][x].color_idx):
                    matches.update([(x, y), (x, y+1), (x, y+2)])

        return matches

    def remove_matches(self, matches):
        for x, y in matches:
            self.grid[y][x] = None
        self.score += len(matches) * 10

    def drop_candies(self):
        for x in range(GRID_SIZE):
            # Count empty spaces and move candies down
            for y in range(GRID_SIZE-1, -1, -1):
                if not self.grid[y][x]:
                    # Find next candy above
                    for y_above in range(y-1, -1, -1):
                        if self.grid[y_above][x]:
                            self.grid[y][x] = self.grid[y_above][x]
                            self.grid[y_above][x] = None
                            self.grid[y][x].target_y = y * CELL_SIZE
                            break
            # Fill top with new candies
            for y in range(GRID_SIZE):
                if not self.grid[y][x]:
                    self.grid[y][x] = Candy(random.randint(0, len(COLORS)-1),
                                         x * CELL_SIZE,
                                         -CELL_SIZE)  # Start above screen
                    self.grid[y][x].target_y = y * CELL_SIZE

def main():
    game = Game()
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                pos = game.get_cell(event.pos)
                if game.selected:
                    sel_x, sel_y = game.selected
                    new_x, new_y = pos
                    # Check if adjacent
                    if (abs(sel_x - new_x) + abs(sel_y - new_y) == 1):
                        game.swap(game.selected, pos)
                        matches = game.check_matches()
                        if matches:
                            game.remove_matches(matches)
                            game.drop_candies()
                            # Check for more matches after dropping
                            while matches:
                                matches = game.check_matches()
                                if matches:
                                    game.remove_matches(matches)
                                    game.drop_candies()
                        else:
                            # Swap back if no matches
                            game.swap(pos, game.selected)
                    game.selected = None
                else:
                    game.selected = pos

        game.update()
        game.draw()
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()