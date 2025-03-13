import pygame
import random

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

# Set up display
screen = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE))
pygame.display.set_caption("Candy Crush Clone")
clock = pygame.time.Clock()

class Game:
    def __init__(self):
        self.grid = [[random.randint(0, len(COLORS)-1) for _ in range(GRID_SIZE)] 
                    for _ in range(GRID_SIZE)]
        self.selected = None
        self.score = 0
        self.font = pygame.font.Font(None, 36)

    def draw(self):
        screen.fill((255, 255, 255))
        
        # Draw grid
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE):
                color = COLORS[self.grid[y][x]]
                pygame.draw.circle(screen, color, 
                                 (x * CELL_SIZE + CELL_SIZE//2, 
                                  y * CELL_SIZE + CELL_SIZE//2), 
                                 CELL_SIZE//2 - 5)
                pygame.draw.circle(screen, (0, 0, 0), 
                                 (x * CELL_SIZE + CELL_SIZE//2, 
                                  y * CELL_SIZE + CELL_SIZE//2), 
                                 CELL_SIZE//2 - 5, 2)

        # Draw selection
        if self.selected:
            x, y = self.selected
            pygame.draw.rect(screen, (0, 0, 0), 
                           (x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE), 3)

        # Draw score
        score_text = self.font.render(f"Score: {self.score}", True, (0, 0, 0))
        screen.blit(score_text, (10, 10))

    def get_cell(self, pos):
        x, y = pos
        return x // CELL_SIZE, y // CELL_SIZE

    def swap(self, pos1, pos2):
        x1, y1 = pos1
        x2, y2 = pos2
        self.grid[y1][x1], self.grid[y2][x2] = self.grid[y2][x2], self.grid[y1][x1]

    def check_matches(self):
        matches = set()
        
        # Check horizontal matches
        for y in range(GRID_SIZE):
            for x in range(GRID_SIZE-2):
                if (self.grid[y][x] == self.grid[y][x+1] == self.grid[y][x+2]):
                    matches.update([(x, y), (x+1, y), (x+2, y)])

        # Check vertical matches
        for y in range(GRID_SIZE-2):
            for x in range(GRID_SIZE):
                if (self.grid[y][x] == self.grid[y+1][x] == self.grid[y+2][x]):
                    matches.update([(x, y), (x, y+1), (x, y+2)])

        return matches

    def remove_matches(self, matches):
        for x, y in matches:
            self.grid[y][x] = -1
        self.score += len(matches) * 10

    def drop_candies(self):
        for x in range(GRID_SIZE):
            column = [self.grid[y][x] for y in range(GRID_SIZE)]
            new_column = [c for c in column if c != -1]
            new_column = [random.randint(0, len(COLORS)-1) for _ in range(GRID_SIZE - len(new_column))] + new_column
            for y in range(GRID_SIZE):
                self.grid[y][x] = new_column[y]

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
                    game.selected = None
                else:
                    game.selected = pos

        game.draw()
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()