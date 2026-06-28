# Intrinsic Value Calculator for stocks

A dark, trading-terminal styled web calculator for estimating a stock's **intrinsic value** and your **margin of safety**. It implements the step-by-step value-investing method from [Clime's "Demystifying intrinsic value" guide](http://www.clime.com.au/articles/demystifying-intrinsic-value-step-by-step/).

Punch in the figures from a company's annual report and the calculator works through grossed-up dividends, normalised earnings, NROE, the equity multiplier and equity-per-share to land on a per-share intrinsic value — then compares it against the current and your purchased price.

## Run it locally

The app uses AngularJS, and the input component loads an HTML template over XHR, so it needs to be served over HTTP (opening `index.html` as a `file://` won't load the inputs). Any static server works, e.g.:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open the printed URL.

## Guide for finding the required data

See the `README.md` in the [`finding-the-data`](finding-the-data/README.md) directory — it shows, with screenshots, exactly where in an annual report each figure comes from.

## Credits & license

Original calculator and the data-finding guide by **Tom Saleeba ([@techotom](https://twitter.com/techotom))** — [tomsaleeba/stocks-ivc](https://github.com/tomsaleeba/stocks-ivc). Licensed under **GPL-3.0** (see `LICENSE`). This is a restyled fork with a trading-terminal theme; the underlying valuation logic is unchanged.

> Disclaimer: this calculator has no brain. You need to use yours.
