import { Link } from "@remix-run/react";
import { usePveMode } from "~/contexts/PveModeContext";
import { hapticTap } from "~/utils/haptic";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isPveMode } = usePveMode();

  return (
    <footer className={`text-center text-neutral-50 py-5 font-raleway transition-colors duration-700 ${isPveMode ? 'bg-black' : 'bg-neutral-800'}`}>
      <p className="m-0">
        ©2014-{currentYear}{" "}
        <span className={isPveMode ? 'text-pve-purple' : 'text-pink-400'}>MOFUCRAFT!!!</span>
      </p>
      <p className="m-0">
        <Link
          to="//mofucraft.net/terms"
          onClick={() => hapticTap()}
          className={`text-neutral-50 transition-colors duration-300 focus:outline-none ${isPveMode ? 'hover:text-pve-purple' : 'hover:text-pink-400'}`}
        >
          利用規約
        </Link>
      </p>
    </footer>
  );
}
