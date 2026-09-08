const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

/** Load the webfont after first paint so the first screen is not blocked. */
export function PretendardStylesheet() {
  return (
    <>
      <link
        rel="stylesheet"
        href={PRETENDARD_CSS}
        media="print"
        data-rankon-font="pretendard"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var l=document.querySelector('link[data-rankon-font="pretendard"]');if(!l)return;function r(){l.media='all'}if(l.sheet){r()}else{l.addEventListener('load',r)}})();`,
        }}
      />
    </>
  );
}

export const PRETENDARD_STYLESHEET_HREF = PRETENDARD_CSS;
