"use client";

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import NGOCard from "@/components/admin/NGOCard";

export default function NGOs() {
  const [ngos, setNgos] = useState<any[]>([]);

  useEffect(() => {
    const fetchNGOs = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNgos(data);
    };

    fetchNGOs();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">NGO Approvals</h1>

      <div className="grid gap-4">
        {ngos.map((ngo) => (
          <NGOCard key={ngo.id} ngo={ngo} />
        ))}
      </div>
    </div>
  );
}