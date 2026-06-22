import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <div className="p-5 rounded-full bg-gold-500/10 border border-gold-500/20">
          <Globe2 size={36} className="text-gold-400" />
        </div>
        <div>
          <p className="font-mono text-gold-500/60 text-xs uppercase tracking-widest mb-2">
            Error 404
          </p>
          <h1 className="font-display text-4xl font-bold text-foreground">Page Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This diplomatic route does not exist.
          </p>
        </div>
        <Button asChild>
          <Link to="/">Go to Homepage</Link>
        </Button>
      </motion.div>
    </div>
  );
}
