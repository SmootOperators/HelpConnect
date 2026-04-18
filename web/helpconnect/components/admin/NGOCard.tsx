"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NGOCard({ ngo }: any) {
  const approve = async () => {
    await updateDoc(doc(db, "users", ngo.id), {
      verified: true,
    });
  };

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="font-bold">{ngo.name}</h2>
      <p>{ngo.email}</p>

      {!ngo.verified && (
        <button
          onClick={approve}
          className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
        >
          Approve
        </button>
      )}
    </div>
  );
}