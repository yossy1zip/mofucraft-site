import { Link } from "@remix-run/react";
import { hapticTap } from "~/utils/haptic";

export default function NotFound() {
  return (
    <>
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 font-raleway">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-300 mb-4">
            404 Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            ページが見つかりませんでした。
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-lg mt-2">
            URLに間違いがないかご確認ください ( ˘ω˘ )
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-lg mt-2">
            <Link
              to="/"
              onClick={() => hapticTap()}
              className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-gray-800 text-white hover:bg-gray-900 focus:outline-hidden focus:bg-gray-900 disabled:opacity-50 disabled:pointer-events-none dark:bg-white dark:text-gray-800"
            >
              トップへ戻る
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}