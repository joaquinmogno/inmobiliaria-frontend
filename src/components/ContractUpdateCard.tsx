import { formatDate } from "../utils/date";
import { type UpdatingContract } from "../pages/Home";
import { UsersIcon, CalendarIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface ContractUpdateCardProps {
    contract: UpdatingContract;
    onClick?: () => void;
}

export default function ContractUpdateCard({ contract, onClick }: ContractUpdateCardProps) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-orange-500">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <a
                        onClick={onClick}
                        className="font-semibold text-base text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                    >
                        {contract.address}
                    </a>

                    <div className="mt-2">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <UsersIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate"><span className="font-medium">Inquilino:</span> {contract.tenant}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(contract.updateDate)}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md font-semibold text-xs whitespace-nowrap">
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>Actualiza en {contract.daysLeft} días</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

