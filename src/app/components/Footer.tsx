import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>
          Got questions or feedback? Check out the{" "}
          <a
            href="https://github.com/microbecode/merkle-visualizer"
            target="_blank"
          >
            GitHub repository
          </a>{" "}
          or poke me on{" "}
          <a href="https://x.com/LauriPelto" target="_blank">
            X
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
