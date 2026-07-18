import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, FileText, ArrowLeft, ArrowRight, Calendar, CheckCircle2, Clock, Activity,
} from "lucide-react";
import {
  listRfqDocuments, listQuotes, listActivity,
  type RfqDocument, type RfqQuote, type ActivityEvent,
} from "@/lib/rfqApi";

export default function RfqHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rfqs, setRfqs] = useState<RfqDocument[]>([]);
  const [quotes, setQuotes] = useState<RfqQuote[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, q, a] = await Promise.all([
        listRfqDocuments(),
        listQuotes(),
        listActivity({ limit: 100 }),
      ]);
      setRfqs(r); setQuotes(q); setEvents(a);
    } catch (err) {
      toast({ title: "Failed to load history", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!user) {
    return <AppLayout><div className="p-12 text-center">Please <Link href="/login" className="underline">sign in</Link>.</div></AppLayout>;
  }

  return (
    <AppLayout>
      <Helmet><title>RFQ History — Xuvilo Business Hub</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/rfq"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 me-1" /> Back</Button></Link>
            <h1 className="text-2xl font-bold">RFQ History</h1>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <Tabs defaultValue="rfqs">
            <TabsList>
              <TabsTrigger value="rfqs">RFQs ({rfqs.length})</TabsTrigger>
              <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity ({events.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="rfqs" className="mt-4">
              <Card><CardContent className="p-0">
                {rfqs.length === 0 ? <Empty msg="No RFQs yet." /> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr className="text-start">
                        <Th>RFQ #</Th><Th>Client</Th><Th>Status</Th><Th>Items</Th><Th>Closing</Th><Th></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfqs.map((d) => (
                        <tr key={d.id} className="border-t border-gray-100 dark:border-gray-900">
                          <Td><Link href={`/rfq?id=${d.id}`} className="hover:underline">{d.rfqNumber || d.sourceFilename}</Link></Td>
                          <Td>{d.detectedClientName || "—"}</Td>
                          <Td><Badge variant="outline" className="text-[10px]">{d.status}</Badge></Td>
                          <Td>{d.itemCount}</Td>
                          <Td>{d.closingDate || "—"}</Td>
                          <Td><Link href={`/rfq/quote/new?rfq=${d.id}`} className="text-violet-600 hover:underline text-xs">Quote →</Link></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <Card><CardContent className="p-0">
                {quotes.length === 0 ? <Empty msg="No quotes drafted yet." /> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr><Th>Quote #</Th><Th>Subject</Th><Th>Status</Th><Th>Total</Th><Th>Sent</Th><Th></Th></tr>
                    </thead>
                    <tbody>
                      {quotes.map((q) => (
                        <tr key={q.id} className="border-t border-gray-100 dark:border-gray-900">
                          <Td><Link href={`/rfq/quote/${q.id}`} className="hover:underline">{q.quoteNumber}</Link></Td>
                          <Td className="max-w-xs truncate">{q.subject}</Td>
                          <Td><Badge variant="outline" className="text-[10px]">{q.status}</Badge></Td>
                          <Td className="font-mono">{q.currency} {Number(q.total).toFixed(2)}</Td>
                          <Td>{q.emailSentAt ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-gray-400" />}</Td>
                          <Td><Link href={`/rfq/quote/${q.id}`} className="text-violet-600 hover:underline text-xs">Open →</Link></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card><CardContent className="p-3 space-y-2">
                {events.length === 0 ? <Empty msg="No activity yet." /> : (
                  events.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900">
                      <Activity className="w-4 h-4 mt-0.5 text-violet-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{e.title}</div>
                        {e.description && <div className="text-xs text-gray-500">{e.description}</div>}
                        <div className="text-[10px] text-gray-400 mt-0.5"><Calendar className="w-3 h-3 inline" /> {new Date(e.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

const Th = ({ children }: { children?: React.ReactNode }) => <th className="py-2 px-3 text-start text-xs font-semibold text-gray-500 uppercase">{children}</th>;
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <td className={`py-2 px-3 ${className}`}>{children}</td>;
const Empty = ({ msg }: { msg: string }) => <div className="p-8 text-center text-sm text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />{msg}</div>;
