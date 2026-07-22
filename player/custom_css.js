(function() {
    'use strict';

    const logo = document.querySelector('#logo');
    if (logo) {
        logo.remove();
    }

    const footer = document.querySelector('#footer');
    if (footer) {
        footer.remove();
    }

    const style = document.createElement('style');
    style.textContent = `

    @media screen and (max-width: 400px) {
        :root {
            font-size: 13px;
        }
    }
    #sources :first-child {
	    margin-left: auto;
    }

    #sources :last-child {
        margin-right: auto;
    }

    @media screen and (max-width: 800px), screen and (max-height: 600px) {
        #container {
            padding: 1.5rem;
            padding-left: 0 !important;
            padding-right: 0 !important;
        }

        #header,
        #sources,
        #footer {
            font-size: 1.2rem;
            height: 3.5rem;
            min-height: 3.5rem;
            line-height: 3.5rem;
        }

        #header {
            padding-right: 0;
        }

        #watched-movies-toggle {
            font-size: 0.9rem;
            white-space: normal;
            word-wrap: break-word;
            word-break: normal;
            line-height: 1.4;
            width: 5rem;
            min-width: 5rem;
            max-width: 5rem;

        }
        
        #watched-movies-panel {
            font-size: 16px;
            top: 4rem;
            right: 0.5em;
            width: calc(100% - 1em);
            gap: 0.4em;
            box-shadow: 0 0.25em 0.5em rgba(0, 0, 0, 0.6);
        }

        #watched-movies-search {
            height: 2em;
            font-size: 0.85em;
            line-height: 2em;
            padding: 0 0.6em;
        }

        .movie-link {
            font-size: 0.8em;
            padding: 0em 0.4em;
            line-height: calc(1.25em * 1.75);
            min-height: calc(1.25em * 1.75);
        }
    }
`;
    document.head.appendChild(style);
})();