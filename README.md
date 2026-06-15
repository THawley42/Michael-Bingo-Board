# Bingo Board

A simple static bingo card generator. Each visitor gets their own shuffled 5x5
board (with a FREE center space) from a customizable list of items.

## Features

- **New Card** – shuffle a fresh board from the current item list
- **Clear Marks** – unmark all squares (FREE stays marked)
- **Edit List** – change the title and the list of items (need at least 24)
- **Copy Share Link** – generates a URL that loads your custom title/items
  for anyone who opens it
- Click a square to mark it; getting 5 in a row/column/diagonal shows a
  BINGO banner

## Running locally

Just open `index.html` in a browser, or serve the folder with any static
file server, e.g.:

```
npx serve .
```

## Deployment

This is a static site (HTML/CSS/JS only, no build step) and can be hosted on
AWS Amplify Hosting by connecting this GitHub repository.
